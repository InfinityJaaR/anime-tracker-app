import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import {
  isRunningInExpoGo,
  MAL_NATIVE_REDIRECT_URI,
  useAuth,
} from '@/lib/auth/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isAuthenticated } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inExpoGo = isRunningInExpoGo();

  const handleSignIn = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const ok = await signIn();
      if (ok && router.canGoBack()) {
        router.back();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setIsBusy(false);
    }
  };

  const copyRedirect = async () => {
    await Clipboard.setStringAsync(MAL_NATIVE_REDIRECT_URI);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="close" size={28} color={AppColors.textMuted} />
      </Pressable>

      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Ionicons name="tv-outline" size={44} color={AppColors.accent} />
        </View>
        <Text style={styles.title}>Anime Tracker</Text>
        <Text style={styles.subtitle}>
          Conecta tu cuenta de MyAnimeList para llevar el seguimiento de tus animes. Tus listas se
          guardan directamente en MAL.
        </Text>

        {inExpoGo ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Necesitas el development build</Text>
            <Text style={styles.warningText}>
              Expo Go no puede completar el OAuth de MAL (el scheme animetrackerapp:// solo lo
              tiene tu APK). Genera el build con EAS, instálalo y arranca con --dev-client.
            </Text>
          </View>
        ) : null}

        {isAuthenticated ? (
          <Text style={styles.subtitle}>Ya has iniciado sesión.</Text>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.malButton,
              pressed && styles.buttonPressed,
              inExpoGo && styles.buttonDisabled,
            ]}
            onPress={handleSignIn}
            disabled={isBusy || inExpoGo}>
            {isBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.malBadge}>MAL</Text>
                <Text style={styles.malButtonText}>Iniciar sesión con MyAnimeList</Text>
              </>
            )}
          </Pressable>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.redirectBox}>
          <Text style={styles.redirectLabel}>
            En myanimelist.net/apiconfig → App Redirect URL (ya configurado):
          </Text>
          <Pressable onPress={copyRedirect}>
            <Text style={styles.redirectUri} selectable>
              {MAL_NATIVE_REDIRECT_URI}
            </Text>
            <Text style={styles.copyHint}>{copied ? 'Copiado' : 'Toca para copiar'}</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          También puedes explorar y buscar animes sin iniciar sesión.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  closeButton: { alignSelf: 'flex-end', padding: 16 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: AppColors.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: AppColors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  warningBox: {
    backgroundColor: '#3A2A12',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    gap: 6,
  },
  warningTitle: { color: '#F0C674', fontSize: 14, fontWeight: '700' },
  warningText: { color: AppColors.textMuted, fontSize: 12, lineHeight: 18 },
  malButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AppColors.accent,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 10,
    marginTop: 12,
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.45 },
  malBadge: {
    backgroundColor: '#1D4E89',
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  malButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: AppColors.danger, textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
  redirectBox: {
    marginTop: 20,
    backgroundColor: AppColors.surface,
    borderRadius: 10,
    padding: 14,
    width: '100%',
    gap: 8,
  },
  redirectLabel: { color: AppColors.textMuted, fontSize: 12, lineHeight: 18 },
  redirectUri: { color: AppColors.accent, fontSize: 13, fontWeight: '600' },
  copyHint: { color: AppColors.textMuted, fontSize: 11, marginTop: 4 },
  hint: { color: AppColors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 24 },
});
