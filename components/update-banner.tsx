import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import { useAppUpdate } from '@/hooks/use-app-update';
import { useOtaUpdate } from '@/hooks/use-ota-update';

/**
 * Aviso fijo abajo. Si hay un APK más nuevo (cambio de versión) pide descargarlo;
 * si no, avisa de una actualización OTA ya descargada y lista para aplicar.
 */
export function UpdateBanner() {
  const { isUpdatePending, reload } = useOtaUpdate();
  const { release } = useAppUpdate();
  const insets = useSafeAreaInsets();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  if (release && release.version !== dismissedVersion) {
    return (
      <View style={[styles.wrapper, { paddingBottom: insets.bottom + 72 }]} pointerEvents="box-none">
        <View style={styles.banner}>
          <Ionicons name="cloud-download-outline" size={20} color={AppColors.accent} />
          <View style={styles.textBlock}>
            <Text style={styles.title}>Versión {release.version} disponible</Text>
            <Text style={styles.subtitle}>Descarga e instala el APK nuevo.</Text>
          </View>
          <Pressable
            style={styles.button}
            onPress={() => void Linking.openURL(release.downloadUrl)}
            hitSlop={6}>
            <Text style={styles.buttonText}>Descargar</Text>
          </Pressable>
          <Pressable onPress={() => setDismissedVersion(release.version)} hitSlop={10}>
            <Ionicons name="close" size={20} color={AppColors.textMuted} />
          </Pressable>
        </View>
      </View>
    );
  }

  if (!isUpdatePending) return null;

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 72 }]} pointerEvents="box-none">
      <View style={styles.banner}>
        <Ionicons name="cloud-download-outline" size={20} color={AppColors.accent} />
        <View style={styles.textBlock}>
          <Text style={styles.title}>Nueva versión disponible</Text>
          <Text style={styles.subtitle}>Reinicia para aplicar los cambios.</Text>
        </View>
        <Pressable style={styles.button} onPress={reload} hitSlop={6}>
          <Text style={styles.buttonText}>Reiniciar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AppColors.surface,
    borderColor: AppColors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  textBlock: { flex: 1 },
  title: { color: AppColors.text, fontSize: 14, fontWeight: '700' },
  subtitle: { color: AppColors.textMuted, fontSize: 12, marginTop: 2 },
  button: {
    backgroundColor: AppColors.accent,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
