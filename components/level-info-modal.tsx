import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import { RANKS } from '@/lib/stats';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Rango actual, para resaltarlo en el listado. */
  currentRank?: string;
}

/** Listado de rangos y cuántos animes completados hace falta para cada uno. */
export function LevelInfoModal({ visible, onClose, currentRank }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Levels</Text>
          <ScrollView style={styles.list}>
            {RANKS.map((rank, index) => {
              const from = index > 0 ? RANKS[index - 1].max + 1 : 0;
              const range = Number.isFinite(rank.max) ? `${from} - ${rank.max}` : `${from}+`;
              const active = rank.name === currentRank;
              return (
                <View key={rank.name} style={styles.row}>
                  <Text style={[styles.range, active && styles.activeText]}>{range}</Text>
                  <Text style={[styles.name, active && styles.activeText]}>{rank.name}</Text>
                </View>
              );
            })}
          </ScrollView>
          <Pressable style={styles.okButton} onPress={onClose}>
            <Text style={styles.okText}>OK</Text>
          </Pressable>
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
    maxHeight: '80%',
  },
  title: {
    color: AppColors.text,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  list: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 16 },
  range: { color: AppColors.textMuted, fontSize: 14, width: 80 },
  name: { color: AppColors.text, fontSize: 15, flexShrink: 1 },
  activeText: { color: AppColors.accent, fontWeight: '700' },
  okButton: { alignSelf: 'flex-end', paddingHorizontal: 24, paddingTop: 14 },
  okText: { color: AppColors.accent, fontSize: 16, fontWeight: '700' },
});
