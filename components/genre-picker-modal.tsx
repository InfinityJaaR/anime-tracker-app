import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import { GENRES } from '@/lib/genres';

interface Props {
  visible: boolean;
  title: string;
  /** IDs de MAL seleccionados. */
  value: number[];
  /** Texto del botón que confirma (p. ej. "GUARDAR" o "OK"). */
  confirmLabel?: string;
  /** Muestra el botón para vaciar la selección. */
  allowReset?: boolean;
  onClose: () => void;
  onConfirm: (ids: number[]) => void;
}

/** Selección múltiple de géneros con casillas; no aplica nada hasta confirmar. */
export function GenrePickerModal({
  visible,
  title,
  value,
  confirmLabel = 'GUARDAR',
  allowReset = true,
  onClose,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState<number[]>(value);

  // Cada vez que se abre parte de la selección vigente.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const toggle = (id: number) =>
    setDraft((current) => (current.includes(id) ? current.filter((g) => g !== id) : [...current, id]));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.list}>
            {GENRES.map((genre) => {
              const checked = draft.includes(genre.id);
              return (
                <Pressable key={genre.id} style={styles.row} onPress={() => toggle(genre.id)}>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                  </View>
                  <Text style={styles.rowText}>{genre.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.actions}>
            {allowReset ? (
              <Pressable onPress={() => setDraft([])} hitSlop={8}>
                <Text style={styles.actionText}>RESET</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => onConfirm(draft)} hitSlop={8}>
              <Text style={styles.actionText}>{confirmLabel}</Text>
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
    paddingVertical: 48,
  },
  panel: { backgroundColor: AppColors.surface, borderRadius: 12, maxHeight: '100%' },
  title: { color: AppColors.text, fontSize: 20, fontWeight: '700', padding: 20, paddingBottom: 8 },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: AppColors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: AppColors.accent, borderColor: AppColors.accent },
  rowText: { color: AppColors.text, fontSize: 16 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 28,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  actionText: { color: AppColors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
});
