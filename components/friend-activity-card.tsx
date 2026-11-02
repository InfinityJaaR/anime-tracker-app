import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { MalMyListStatus } from '@/lib/api/mal';
import { describeActivity, isAhead, type ActivityItem } from '@/lib/friends-activity';
import { formatTimeAgo } from '@/lib/format';

interface Props {
  entry: ActivityItem;
  /** Tu estado en ese anime (si está en tu lista), para el aviso de spoilers. */
  mine?: MalMyListStatus;
  now: number;
  /** Muestra el nombre del amigo delante de la frase (oculto en su propia pantalla). */
  showFriend?: boolean;
  onPress: () => void;
}

/** Entrada de actividad: portada, anime, qué hizo el amigo, cuándo y si va por delante de ti. */
export function FriendActivityCard({ entry, mine, now, showFriend = true, onPress }: Props) {
  const { item } = entry;
  const ahead = isAhead(item.list_status, mine);
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <Image
        source={{ uri: item.node.main_picture?.large ?? item.node.main_picture?.medium }}
        style={styles.cover}
        contentFit="cover"
        transition={150}
      />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.node.title}
        </Text>
        <Text style={styles.action} numberOfLines={2}>
          {showFriend ? <Text style={styles.friend}>{entry.friend} </Text> : null}
          {describeActivity(item)}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.time}>{formatTimeAgo(entry.at, now)}</Text>
          {ahead ? (
            <View style={styles.spoiler}>
              <Ionicons name="warning-outline" size={13} color={AppColors.scoreMid} />
              <Text style={styles.spoilerText}>Va adelante</Text>
            </View>
          ) : null}
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
  pressed: { opacity: 0.85 },
  cover: { width: 70, height: 100 },
  body: { flex: 1, padding: 12, gap: 3, justifyContent: 'space-between' },
  title: { color: AppColors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  action: { color: AppColors.textMuted, fontSize: 13, lineHeight: 18 },
  friend: { color: AppColors.accent, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { color: AppColors.textMuted, fontSize: 12 },
  spoiler: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spoilerText: { color: AppColors.scoreMid, fontSize: 12, fontWeight: '700' },
});
