import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

/** Episodios extra que se ofrecen cuando el total aún no se conoce. */
const UNKNOWN_TOTAL_MARGIN = 12;

interface Props {
  visible: boolean;
  value: number;
  /** Total de episodios según MAL/Jikan. 0 o undefined si aún no se sabe. */
  totalEpisodes: number;
  onClose: () => void;
  onSelect: (episodes: number) => void;
}

/**
 * "Set your Progress" en cuadrícula. El rango se adapta al anime: si el total es
 * conocido llega hasta ahí; si sigue en emisión o el dato falta, se ofrecen unos
 * cuantos episodios por encima del máximo conocido y el listado crece solo
 * conforme MAL actualiza `num_episodes`.
 */
export function EpisodePickerModal({ visible, value, totalEpisodes, onClose, onSelect }: Props) {
  const max = useMemo(
    () =>
      totalEpisodes > 0
        ? Math.max(totalEpisodes, value)
        : Math.max(value, totalEpisodes) + UNKNOWN_TOTAL_MARGIN,
    [totalEpisodes, value],
  );

  const options = useMemo(() => Array.from({ length: max + 1 }, (_, i) => i), [max]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Set your Progress</Text>
          <Text style={styles.subtitle}>
            {totalEpisodes > 0 ? `${totalEpisodes} episodios` : 'Total de episodios desconocido'}
          </Text>
          <ScrollView contentContainerStyle={styles.grid}>
            {options.map((episode) => {
              const active = episode === value;
              return (
                <Pressable
                  key={episode}
                  style={[styles.cell, active && styles.cellActive]}
                  onPress={() => {
                    onSelect(episode);
                    onClose();
                  }}>
                  <Text style={[styles.cellText, active && styles.cellTextActive]}>{episode}</Text>
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
  title: { color: AppColors.text, fontSize: 20, fontWeight: '700', paddingHorizontal: 20 },
  subtitle: {
    color: AppColors.textMuted,
    fontSize: 13,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  cell: {
    flexBasis: '30%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cellActive: { backgroundColor: AppColors.accent, borderColor: AppColors.accent },
  cellText: { color: AppColors.text, fontSize: 16 },
  cellTextActive: { color: '#fff', fontWeight: '700' },
  footer: { alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 12 },
  cancelText: { color: AppColors.textMuted, fontSize: 14, fontWeight: '700' },
});
