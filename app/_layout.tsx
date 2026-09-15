import { DarkTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppColors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth/auth-context';
import { FavoritesProvider } from '@/lib/favorites-context';
import {
  CACHE_BUSTER,
  CACHE_MAX_AGE,
  queryPersister,
  shouldPersistQuery,
} from '@/lib/query-persister';

export const unstable_settings = {
  anchor: '(tabs)',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Debe ser >= al maxAge del persister: con el valor por defecto (5 min) la
      // recolección de basura tiraba el caché antes de que venciera su staleTime.
      gcTime: CACHE_MAX_AGE,
    },
  },
});

// La app usa siempre tema oscuro (estilo de la app original).
const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: AppColors.accent,
    background: AppColors.background,
    card: AppColors.background,
    text: AppColors.text,
    border: AppColors.border,
  },
};

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(AppColors.background);
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: CACHE_MAX_AGE,
        buster: CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}>
      <AuthProvider>
        <FavoritesProvider>
          <ThemeProvider value={navigationTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="anime/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="favorites" options={{ headerShown: false }} />
              <Stack.Screen name="search" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="light" />
          </ThemeProvider>
        </FavoritesProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
