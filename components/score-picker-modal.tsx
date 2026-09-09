import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

/** Etiquetas oficiales de la escala de puntuación de MyAnimeList. */
export const SCORE_LABELS = [
  'Unrated',
  'Appalling',
  'Horrible',
  'Very Bad',
  'Bad',
  'Average',
  'Fine',
  'Good',
  'Very Good',
  'Great',
  'Masterpiece',
];

interface Props {
  visible: boolean;
  value: number;
  onClose: () => void;
  onSelect: (score: number) => void;
}

export function ScorePickerModal({ visible, value, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Rate this Anime</Text>
          <ScrollView contentContainerStyle={styles.grid}>
            {SCORE_LABELS.map((label, score) => {
              const active = score === value;
              return (
                <Pressable
                  key={label}
                  style={[styles.cell, active && styles.cellActive]}
                  onPress={() => {
                    onSelect(score);
                    onClose();
                  }}>
                  <Text style={[styles.cellScore, active && styles.cellTextActive]}>
                    {score === 0 ? '—' : score}
                  </Text>
                  <Text style={[styles.cellLabel, active && styles.cellTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
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
  panel: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    maxHeight: '75%',
  },
  title: {
    color: AppColors.text,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  cell: {
    flexBasis: '46%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  cellActive: { backgroundColor: AppColors.accent, borderColor: AppColors.accent },
  cellScore: { color: AppColors.text, fontSize: 18, fontWeight: '700' },
  cellLabel: { color: AppColors.textMuted, fontSize: 12 },
  cellTextActive: { color: '#fff' },
  footer: { alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 12 },
  cancelText: { color: AppColors.textMuted, fontSize: 14, fontWeight: '700' },
});
