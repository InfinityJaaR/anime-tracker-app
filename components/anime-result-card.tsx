import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { JikanAnime } from '@/lib/api/jikan';
import { isoToDate } from '@/lib/format';
import { mediaTypeLabel } from '@/lib/genres';

export function AnimeResultCard({
  anime,
  alreadyAdded = false,
  onPress,
}: {
  anime: JikanAnime;
  alreadyAdded?: boolean;
  onPress: () => void;
}) {
  const from = isoToDate(anime.aired?.from);
  const to = isoToDate(anime.aired?.to);

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <Image
        source={{ uri: anime.images.jpg.large_image_url ?? anime.images.jpg.image_url }}
        style={styles.cover}
        contentFit="cover"
        transition={150}
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {anime.title}
        </Text>
        <Text style={styles.meta}>
          {[
            mediaTypeLabel(anime.type),
            anime.episodes ? `${anime.episodes} eps` : null,
            anime.score ? `★ ${anime.score.toFixed(2)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {from || to ? (
          <Text style={styles.meta}>
            {from ?? '?'} - {to ?? '?'}
          </Text>
        ) : null}
        {anime.synopsis ? (
          <Text style={styles.synopsis} numberOfLines={2}>
            {anime.synopsis}
          </Text>
        ) : null}
        {alreadyAdded ? <Text style={styles.addedTag}>Ya está en tu lista</Text> : null}
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
  cover: { width: 85, height: 125 },
  cardBody: { flex: 1, padding: 12, gap: 3 },
  cardTitle: { color: AppColors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  meta: { color: AppColors.textMuted, fontSize: 12 },
  synopsis: { color: AppColors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  addedTag: { color: AppColors.accent, fontSize: 12, fontWeight: '600', marginTop: 2 },
});
