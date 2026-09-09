import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

export interface DraftChange {
  label: string;
  from: string;
  to: string;
}

interface Props {
  visible: boolean;
  animeTitle: string;
  changes: DraftChange[];
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmación explícita antes de escribir los cambios en MyAnimeList. */
export function ConfirmUpdateModal({
  visible,
  animeTitle,
  changes,
  pending,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>¿Guardar en MyAnimeList?</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {animeTitle}
          </Text>

          <View style={styles.changes}>
            {changes.map((change) => (
              <View key={change.label} style={styles.changeRow}>
                <Text style={styles.changeLabel}>{change.label}</Text>
                <View style={styles.changeValues}>
                  <Text style={styles.from} numberOfLines={1}>
                    {change.from}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={AppColors.textMuted} />
                  <Text style={styles.to} numberOfLines={1}>
                    {change.to}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onCancel} disabled={pending}>
              <Text style={styles.cancelText}>CANCELAR</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, pending && styles.disabled]}
              onPress={onConfirm}
              disabled={pending}>
              <Text style={styles.confirmText}>{pending ? 'GUARDANDO…' : 'CONFIRMAR'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  panel: { backgroundColor: AppColors.surface, borderRadius: 12, padding: 20 },
  title: { color: AppColors.text, fontSize: 19, fontWeight: '700' },
  subtitle: { color: AppColors.textMuted, fontSize: 13, marginTop: 4 },
  changes: { marginTop: 16, gap: 12 },
  changeRow: { gap: 4 },
  changeLabel: { color: AppColors.textMuted, fontSize: 12, fontWeight: '600' },
  changeValues: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  from: { color: AppColors.textMuted, fontSize: 15, flexShrink: 1 },
  to: { color: AppColors.accent, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20, marginTop: 24 },
  cancelButton: { paddingVertical: 8, paddingHorizontal: 8 },
  cancelText: { color: AppColors.textMuted, fontSize: 14, fontWeight: '700' },
  confirmButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
