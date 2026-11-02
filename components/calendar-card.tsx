import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { CalendarEntry } from '@/lib/calendar';
import { formatAiringDate, formatCountdown } from '@/lib/format';

interface Props {
  entry: CalendarEntry;
  now: number;
  onPress: () => void;
}

/** Tarjeta del calendario: portada con número de episodio, título y hora de emisión. */
export function CalendarCard({ entry, now, onPress }: Props) {
  const msLeft = entry.airingAt - now;
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View>
        <Image source={{ uri: entry.imageUrl }} style={styles.cover} contentFit="cover" transition={150} />
        <View style={styles.episodeBadge}>
          <Text style={styles.episodeText}>EP{entry.episode}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={3}>
          {entry.title}
        </Text>
        <View style={styles.timeRow}>
          <Text style={styles.date} numberOfLines={1}>
            {formatAiringDate(entry.airingAt)}
          </Text>
          <Text style={styles.countdown} numberOfLines={1}>
            {msLeft > 0 ? `en ${formatCountdown(msLeft)}` : 'Ya disponible'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 5,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.85 },
  cover: { width: 95, height: 130 },
  episodeBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  episodeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  body: { flex: 1, padding: 12, justifyContent: 'space-between' },
  title: { color: AppColors.text, fontSize: 16, fontWeight: '700', lineHeight: 21 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  date: { color: AppColors.text, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  countdown: { color: AppColors.accent, fontSize: 13, fontWeight: '600' },
});
