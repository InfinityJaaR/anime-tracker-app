import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { MalListItem } from '@/lib/api/mal';
import { formatDateRange } from '@/lib/format';

interface Props {
  item: MalListItem;
  onPress: () => void;
  onMenu: () => void;
}

/** Tarjeta de la lista Home: portada, título, fechas, progreso y menú. */
export function AnimeListCard({ item, onPress, onMenu }: Props) {
  const { node, list_status: listStatus } = item;
  const total = node.num_episodes ?? 0;
  const watched = listStatus.num_episodes_watched;
  const progress = total > 0 ? Math.min(watched / total, 1) : 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      onLongPress={onMenu}>
      <Image
        source={{ uri: node.main_picture?.large ?? node.main_picture?.medium }}
        style={styles.cover}
        contentFit="cover"
        transition={150}
      />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {node.title}
          </Text>
          <Pressable onPress={onMenu} hitSlop={10} style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={18} color={AppColors.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.dates}>{formatDateRange(node.start_date, node.end_date)}</Text>
        <View style={styles.progressBlock}>
          <Text style={styles.progressText}>
            {watched}/{total > 0 ? total : '?'}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
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
  body: { flex: 1, padding: 12, justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { flex: 1, color: AppColors.text, fontSize: 16, fontWeight: '700', lineHeight: 21 },
  menuButton: { marginLeft: 6, marginTop: 2 },
  dates: { color: AppColors.textMuted, fontSize: 13, marginTop: 2 },
  progressBlock: { gap: 6 },
  progressText: { color: AppColors.textMuted, fontSize: 13 },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: AppColors.progressTrack,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: AppColors.accent },
});
