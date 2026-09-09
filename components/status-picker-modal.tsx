import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { MalWatchStatus } from '@/lib/api/mal';

/**
 * MAL no tiene un estado "Rewatching": es `watching` con el flag `is_rewatching`.
 * Aquí se trata como una opción más de la lista.
 */
export type StatusChoice = MalWatchStatus | 'rewatching';

const OPTIONS: { key: StatusChoice; label: string }[] = [
  { key: 'watching', label: 'Watching' },
  { key: 'plan_to_watch', label: 'Planned' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
  { key: 'dropped', label: 'Dropped' },
  { key: 'rewatching', label: 'Rewatching' },
];

export const STATUS_CHOICE_LABELS = Object.fromEntries(
  OPTIONS.map((o) => [o.key, o.label]),
) as Record<StatusChoice, string>;

interface Props {
  visible: boolean;
  value: StatusChoice;
  onClose: () => void;
  onSelect: (choice: StatusChoice) => void;
}

export function StatusPickerModal({ visible, value, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Set your Status</Text>
          {OPTIONS.map((option) => {
            const active = option.key === value;
            return (
              <Pressable
                key={option.key}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => {
                  onSelect(option.key);
                  onClose();
                }}>
                <Text style={[styles.rowText, active && styles.rowTextActive]}>{option.label}</Text>
                {active ? (
                  <Ionicons name="checkmark" size={20} color={AppColors.accent} />
                ) : null}
              </Pressable>
            );
          })}
          <View style={styles.footer}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancelText}>CANCELAR</Text>
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
  panel: { backgroundColor: AppColors.surface, borderRadius: 12, paddingVertical: 14 },
  title: {
    color: AppColors.text,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  rowPressed: { backgroundColor: AppColors.surfaceLight },
  rowText: { color: AppColors.text, fontSize: 16 },
  rowTextActive: { color: AppColors.accent, fontWeight: '700' },
  footer: { alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 8 },
  cancelText: { color: AppColors.textMuted, fontSize: 14, fontWeight: '700' },
});
