import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

interface Props {
  title: string;
  imageUrl?: string;
  score?: number | null;
  badge?: string | null;
  /** Línea extra bajo el título, p. ej. "EP 11" o "12 episodios". */
  caption?: string | null;
  onPress: () => void;
  width?: number;
}

/** Póster vertical de los carruseles de Descubrir. */
export function AnimePosterCard({
  title,
  imageUrl,
  score,
  badge,
  caption,
  onPress,
  width = 118,
}: Props) {
  return (
    <Pressable style={{ width }} onPress={onPress}>
      <View>
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { width, height: width * 1.42 }]}
          contentFit="cover"
          transition={150}
        />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {caption ? (
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      ) : score ? (
        <Text style={styles.score}>★ {score.toFixed(2)}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: 8, backgroundColor: AppColors.surfaceLight },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  title: { color: AppColors.text, fontSize: 13, fontWeight: '600', marginTop: 6, lineHeight: 17 },
  caption: { color: AppColors.textMuted, fontSize: 12, marginTop: 2 },
  score: { color: AppColors.accent, fontSize: 12, fontWeight: '600', marginTop: 2 },
});
