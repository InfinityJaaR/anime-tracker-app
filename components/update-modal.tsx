import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import { MalWatchStatus, UpdateListStatusParams, WATCH_STATUS_LABELS } from '@/lib/api/mal';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (params: UpdateListStatusParams) => void;
  initialStatus: MalWatchStatus;
  initialEpisodes: number;
  initialScore: number;
  totalEpisodes: number;
}

const STATUSES = Object.keys(WATCH_STATUS_LABELS) as MalWatchStatus[];

/** Modal para actualizar estado, episodios vistos y puntuación de un anime. */
export function UpdateModal({
  visible,
  onClose,
  onSave,
  initialStatus,
  initialEpisodes,
  initialScore,
  totalEpisodes,
}: Props) {
  const [status, setStatus] = useState<MalWatchStatus>(initialStatus);
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [score, setScore] = useState(initialScore);

  // Resincronizar cuando se abre con nuevos valores.
  useEffect(() => {
    if (visible) {
      setStatus(initialStatus);
      setEpisodes(initialEpisodes);
      setScore(initialScore);
    }
  }, [visible, initialStatus, initialEpisodes, initialScore]);

  const clampEpisodes = (value: number) => {
    if (Number.isNaN(value) || value < 0) return 0;
    if (totalEpisodes > 0 && value > totalEpisodes) return totalEpisodes;
    return value;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Actualizar</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={AppColors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Estado</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {STATUSES.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.chip, status === s && styles.chipActive]}
                  onPress={() => setStatus(s)}>
                  <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                    {WATCH_STATUS_LABELS[s]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.sectionLabel}>
            Episodios vistos {totalEpisodes > 0 ? `(de ${totalEpisodes})` : ''}
          </Text>
          <View style={styles.stepperRow}>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setEpisodes((e) => clampEpisodes(e - 1))}>
              <Ionicons name="remove" size={22} color={AppColors.text} />
            </Pressable>
            <TextInput
              style={styles.episodeInput}
              keyboardType="number-pad"
              value={String(episodes)}
              onChangeText={(text) => setEpisodes(clampEpisodes(parseInt(text, 10) || 0))}
            />
            <Pressable
              style={styles.stepperButton}
              onPress={() => setEpisodes((e) => clampEpisodes(e + 1))}>
              <Ionicons name="add" size={22} color={AppColors.text} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Puntuación</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {Array.from({ length: 11 }, (_, i) => (
                <Pressable
                  key={i}
                  style={[styles.scoreChip, score === i && styles.chipActive]}
                  onPress={() => setScore(i)}>
                  <Text style={[styles.chipText, score === i && styles.chipTextActive]}>
                    {i === 0 ? '—' : i}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Pressable
            style={styles.saveButton}
            onPress={() => {
              onSave({ status, num_watched_episodes: episodes, score });
              onClose();
            }}>
            <Text style={styles.saveButtonText}>Guardar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  panel: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: AppColors.text, fontSize: 20, fontWeight: '700' },
  sectionLabel: { color: AppColors.textMuted, fontSize: 13, fontWeight: '600', marginTop: 18, marginBottom: 8 },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  scoreChip: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 20,
    paddingVertical: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: AppColors.accent, borderColor: AppColors.accent },
  chipText: { color: AppColors.textMuted, fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperButton: {
    backgroundColor: AppColors.surfaceLight,
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeInput: {
    flex: 1,
    backgroundColor: AppColors.background,
    borderRadius: 8,
    color: AppColors.text,
    fontSize: 18,
    textAlign: 'center',
    height: 44,
  },
  saveButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
