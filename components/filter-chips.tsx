import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

export interface FilterOption {
  /** null representa "sin filtro". */
  value: string | null;
  label: string;
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FilterChip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Ionicons
        name="chevron-down"
        size={15}
        color={active ? '#fff' : AppColors.accent}
      />
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

interface SheetProps {
  visible: boolean;
  title: string;
  options: FilterOption[];
  value: string | null;
  onClose: () => void;
  onSelect: (value: string | null) => void;
}

/** Selector de un filtro, con opción para limpiarlo. */
export function FilterSheet({ visible, title, options, value, onClose, onSelect }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.list}>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value ?? 'all'}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}>
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>
                    {option.label}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={20} color={AppColors.accent} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancelText}>CERRAR</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: AppColors.accent,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 13,
    maxWidth: 190,
  },
  chipActive: { backgroundColor: AppColors.accent },
  chipText: { color: AppColors.accent, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  chipTextActive: { color: '#fff' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  panel: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    maxHeight: '75%',
  },
  title: {
    color: AppColors.text,
    fontSize: 19,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  list: { paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowPressed: { backgroundColor: AppColors.surfaceLight },
  rowText: { color: AppColors.text, fontSize: 15 },
  rowTextActive: { color: AppColors.accent, fontWeight: '700' },
  footer: { alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 10 },
  cancelText: { color: AppColors.textMuted, fontSize: 14, fontWeight: '700' },
});
