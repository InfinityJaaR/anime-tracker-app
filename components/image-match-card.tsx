import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import { LOW_CONFIDENCE, type ImageMatch } from '@/lib/api/trace-moe';
import { formatTimestamp } from '@/lib/format';

interface Props {
  match: ImageMatch;
  onPress: () => void;
}

function confidenceColor(similarity: number): string {
  if (similarity >= 0.9) return AppColors.scoreHigh;
  if (similarity >= LOW_CONFIDENCE) return AppColors.scoreMid;
  return AppColors.danger;
}

/** Resultado de la búsqueda por imagen: escena, anime, episodio, minuto y coincidencia. */
export function ImageMatchCard({ match, onPress }: Props) {
  const color = confidenceColor(match.similarity);
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <Image source={{ uri: match.imageUrl }} style={styles.thumb} contentFit="cover" transition={150} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {match.title}
        </Text>
        <Text style={styles.meta}>
          {match.episode != null ? `Episodio ${match.episode} · ` : ''}min {formatTimestamp(match.at)}
        </Text>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>Coincidencia {Math.round(match.similarity * 100)} %</Text>
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
  thumb: { width: 140, height: 88, backgroundColor: AppColors.surfaceLight },
  body: { flex: 1, padding: 12, gap: 4, justifyContent: 'space-between' },
  title: { color: AppColors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  meta: { color: AppColors.textMuted, fontSize: 13 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
