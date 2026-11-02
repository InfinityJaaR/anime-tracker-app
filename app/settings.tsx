import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { LoginButton } from '@/components/login-button';
import { AppColors } from '@/constants/theme';
import { useAppUpdate } from '@/hooks/use-app-update';
import { getVersionLabel } from '@/lib/app-version';
import { useAuth } from '@/lib/auth/auth-context';

export default function SettingsScreen() {
  const router = useRouter();
  const { isAuthenticated, user, signOut } = useAuth();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const { release, isChecking, refetch } = useAppUpdate();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={AppColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Configuración</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Cuentas</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="person-circle-outline" size={28} color={AppColors.text} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>MyAnimeList</Text>
              <Text style={styles.rowSubtitle}>
                {isAuthenticated ? `Conectado como ${user?.name ?? '…'}` : 'Sin sesión iniciada'}
              </Text>
            </View>
          </View>
          {isAuthenticated ? (
            <Pressable style={styles.outlineButton} onPress={() => setConfirmingSignOut(true)}>
              <Text style={styles.outlineButtonText}>Cerrar sesión</Text>
            </Pressable>
          ) : (
            <LoginButton />
          )}
          <Text style={styles.hint}>Más cuentas estarán disponibles próximamente.</Text>
        </View>

        <Text style={styles.sectionLabel}>Apariencia</Text>
        <View style={[styles.card, styles.disabled]}>
          <View style={styles.row}>
            <Ionicons name="color-palette-outline" size={26} color={AppColors.text} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Tema</Text>
              <Text style={styles.rowSubtitle}>Próximamente</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Sobre nosotros</Text>
        <View style={styles.card}>
          <Text style={styles.rowTitle}>Anime Tracker</Text>
          <Text style={styles.rowSubtitle}>{getVersionLabel()}</Text>
          <Text style={styles.about}>
            Un seguimiento de anime hecho para compartir con amigos. Tus listas viven en
            MyAnimeList: lo que marcas aquí queda en tu cuenta.
          </Text>
          {release ? (
            <Pressable style={styles.outlineButton} onPress={() => void Linking.openURL(release.downloadUrl)}>
              <Text style={styles.outlineButtonText}>Descargar versión {release.version}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.outlineButton} onPress={refetch} disabled={isChecking}>
              <Text style={styles.outlineButtonText}>
                {isChecking ? 'Buscando…' : 'Buscar actualizaciones'}
              </Text>
            </Pressable>
          )}
          <Text style={styles.about}>
            Datos de MyAnimeList, Tenrai API y AniList. Traducción de sinopsis con MyMemory.
          </Text>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmingSignOut}
        title="Cerrar sesión"
        message={user ? `Se cerrará la sesión de ${user.name}.` : undefined}
        confirmLabel="CERRAR SESIÓN"
        destructive
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={() => {
          setConfirmingSignOut(false);
          void signOut();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { color: AppColors.text, fontSize: 24, fontWeight: '700' },
  content: { paddingHorizontal: 12, paddingBottom: 32 },
  sectionLabel: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { backgroundColor: AppColors.surface, borderRadius: 12, padding: 16, gap: 12 },
  disabled: { opacity: 0.55 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowText: { flex: 1 },
  rowTitle: { color: AppColors.text, fontSize: 16, fontWeight: '700' },
  rowSubtitle: { color: AppColors.textMuted, fontSize: 13, marginTop: 2 },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: AppColors.accent,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  outlineButtonText: { color: AppColors.accent, fontSize: 15, fontWeight: '700' },
  hint: { color: AppColors.textMuted, fontSize: 12 },
  about: { color: AppColors.textMuted, fontSize: 14, lineHeight: 20 },
});
