/**
 * Autenticación OAuth2 con MyAnimeList.
 *
 * MAL usa Authorization Code + PKCE, pero SOLO soporta el método "plain"
 * (code_challenge === code_verifier). expo-auth-session rechaza Plain en
 * AuthRequest, así que el authorize se hace a mano con WebBrowser.
 *
 * El redirect es FIJO (`animetrackerapp://redirect`) y debe coincidir con
 * App Redirect URL en https://myanimelist.net/apiconfig. Esto requiere un
 * development build (no Expo Go): el scheme nativo solo lo posee tu APK.
 *
 * El login es opcional: sin sesión la app funciona en modo invitado.
 */
import { exchangeCodeAsync, refreshAsync, TokenResponse } from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getMe, MalUser } from '@/lib/api/mal';

WebBrowser.maybeCompleteAuthSession();

const MAL_CLIENT_ID = process.env.EXPO_PUBLIC_MAL_CLIENT_ID ?? '';

const discovery = {
  authorizationEndpoint: 'https://myanimelist.net/v1/oauth2/authorize',
  tokenEndpoint: 'https://myanimelist.net/v1/oauth2/token',
};

/** Redirect fijo registrado en MAL. No usar makeRedirectUri (cambia en Expo Go/túnel). */
export const MAL_NATIVE_REDIRECT_URI = 'animetrackerapp://redirect';
export const malRedirectUri = MAL_NATIVE_REDIRECT_URI;

/** true si la app corre dentro de Expo Go (OAuth nativo no funcionará bien). */
export function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

// Los tokens de MAL son largos: se guardan en claves separadas para no
// exceder el límite recomendado de 2048 bytes por valor de SecureStore.
const KEY_ACCESS = 'mal_access_token';
const KEY_REFRESH = 'mal_refresh_token';
const KEY_EXPIRES_AT = 'mal_expires_at';

const PKCE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

/** Genera un code_verifier PKCE (43–128 chars). MAL exige method=plain. */
function generateCodeVerifier(length = 64): string {
  const bytes = Crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += PKCE_CHARSET[bytes[i] % PKCE_CHARSET.length];
  }
  return out;
}

function parseAuthCallback(url: string): {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
} {
  const parsed = Linking.parse(url);
  const query = parsed.queryParams ?? {};
  const pick = (key: string) => {
    const value = query[key];
    return typeof value === 'string' ? value : undefined;
  };
  return {
    code: pick('code'),
    state: pick('state'),
    error: pick('error'),
    errorDescription: pick('error_description'),
  };
}

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  /** Epoch en milisegundos en que expira el access token. */
  expiresAt: number;
}

async function saveSession(session: StoredSession) {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, session.accessToken),
    SecureStore.setItemAsync(KEY_REFRESH, session.refreshToken),
    SecureStore.setItemAsync(KEY_EXPIRES_AT, String(session.expiresAt)),
  ]);
}

async function loadSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken, expiresAt] = await Promise.all([
    SecureStore.getItemAsync(KEY_ACCESS),
    SecureStore.getItemAsync(KEY_REFRESH),
    SecureStore.getItemAsync(KEY_EXPIRES_AT),
  ]);
  if (!accessToken || !refreshToken || !expiresAt) return null;
  return { accessToken, refreshToken, expiresAt: Number(expiresAt) };
}

async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS),
    SecureStore.deleteItemAsync(KEY_REFRESH),
    SecureStore.deleteItemAsync(KEY_EXPIRES_AT),
  ]);
}

function sessionFromTokenResponse(response: TokenResponse): StoredSession {
  const expiresInSeconds = response.expiresIn ?? 3600;
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken ?? '',
    expiresAt: (response.issuedAt + expiresInSeconds) * 1000,
  };
}

interface AuthContextValue {
  /** true mientras se restaura la sesión guardada al arrancar. */
  isLoading: boolean;
  isAuthenticated: boolean;
  user: MalUser | null;
  /** Mensaje si falló restaurar la sesión (no bloquea el modo invitado). */
  restoreError: string | null;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Devuelve un access token válido, refrescándolo si está por expirar. */
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<MalUser | null>(null);
  const sessionRef = useRef<StoredSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const applySession = useCallback(async (session: StoredSession | null) => {
    sessionRef.current = session;
    setIsAuthenticated(session !== null);
    if (session) {
      await saveSession(session);
    } else {
      await clearSession();
      setUser(null);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string> => {
    const session = sessionRef.current;
    if (!session) {
      throw new Error('No hay sesión de MAL activa');
    }
    // Refrescar si expira en menos de 5 minutos.
    if (Date.now() < session.expiresAt - 5 * 60 * 1000) {
      return session.accessToken;
    }
    try {
      const refreshed = await refreshAsync(
        { clientId: MAL_CLIENT_ID, refreshToken: session.refreshToken },
        discovery,
      );
      const next = sessionFromTokenResponse(refreshed);
      if (!next.refreshToken) next.refreshToken = session.refreshToken;
      await applySession(next);
      return next.accessToken;
    } catch (error) {
      // Refresh token inválido o revocado: cerrar sesión.
      await applySession(null);
      throw error;
    }
  }, [applySession]);

  // Restaurar sesión guardada al arrancar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadSession();
        if (cancelled) return;
        if (!stored) {
          setIsAuthenticated(false);
          return;
        }
        sessionRef.current = stored;
        setIsAuthenticated(true);
        const token = await getAccessToken();
        const me = await getMe(token);
        if (!cancelled) {
          setUser(me);
          setRestoreError(null);
        }
      } catch (error) {
        if (!cancelled) {
          await clearSession();
          sessionRef.current = null;
          setIsAuthenticated(false);
          setUser(null);
          setRestoreError(
            error instanceof Error
              ? `No se pudo restaurar la sesión: ${error.message}`
              : 'No se pudo restaurar la sesión de MAL',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Abre el login real de MAL. Devuelve true si la sesión quedó activa.
   * Lanza error con mensaje usable en UI si falla.
   */
  const signIn = useCallback(async (): Promise<boolean> => {
    if (!MAL_CLIENT_ID) {
      throw new Error('Falta EXPO_PUBLIC_MAL_CLIENT_ID en el archivo .env');
    }

    if (isRunningInExpoGo()) {
      throw new Error(
        'El login de MAL no funciona en Expo Go. Instala el development build (APK) y ábrelo con npx expo start --dev-client.',
      );
    }

    // PKCE plain: code_challenge === code_verifier (único método que acepta MAL).
    const codeVerifier = generateCodeVerifier(64);
    const state = generateCodeVerifier(16);
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: MAL_CLIENT_ID,
      redirect_uri: malRedirectUri,
      code_challenge: codeVerifier,
      code_challenge_method: 'plain',
      state,
    });
    const authUrl = `${discovery.authorizationEndpoint}?${authParams.toString()}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, malRedirectUri);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Inicio de sesión cancelado');
    }
    if (result.type !== 'success' || !('url' in result) || !result.url) {
      throw new Error(`No se completó el login de MAL (${result.type})`);
    }

    const callback = parseAuthCallback(result.url);
    if (callback.error) {
      if (callback.error === 'invalid_client') {
        throw new Error(
          `invalid_client: en MAL apiconfig la App Redirect URL debe ser exactamente ${malRedirectUri}`,
        );
      }
      throw new Error(callback.errorDescription ?? callback.error);
    }
    if (!callback.code) {
      throw new Error('MAL no devolvió un código de autorización. ¿Registraste animetrackerapp://redirect?');
    }
    if (callback.state && callback.state !== state) {
      throw new Error('Estado OAuth inválido (posible CSRF)');
    }

    const tokenResponse = await exchangeCodeAsync(
      {
        clientId: MAL_CLIENT_ID,
        code: callback.code,
        redirectUri: malRedirectUri,
        extraParams: { code_verifier: codeVerifier },
      },
      discovery,
    );

    if (!tokenResponse.accessToken) {
      throw new Error('MAL no devolvió access_token');
    }

    const session = sessionFromTokenResponse(tokenResponse);
    if (!session.refreshToken) {
      throw new Error('MAL no devolvió refresh_token');
    }

    await applySession(session);
    const me = await getMe(session.accessToken);
    setUser(me);
    setRestoreError(null);
    return true;
  }, [applySession]);

  const signOut = useCallback(async () => {
    await applySession(null);
  }, [applySession]);

  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      user,
      restoreError,
      signIn,
      signOut,
      getAccessToken,
    }),
    [isLoading, isAuthenticated, user, restoreError, signIn, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
