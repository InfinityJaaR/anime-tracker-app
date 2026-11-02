import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { AiringInfo } from '@/lib/api/anilist';
import type { MalListItem } from '@/lib/api/mal';
import { resolveAiringState } from '@/lib/airing';
import { formatCountdown, formatDateRange } from '@/lib/format';

/** Verde de 8 a 10, naranja de 4 a 7 y rojo de 0 a 3. */
function scoreColor(score: number): string {
  if (score >= 8) return AppColors.scoreHigh;
  if (score >= 4) return AppColors.scoreMid;
  return AppColors.danger;
}

interface Props {
  item: MalListItem;
  /** Próximo episodio según AniList; solo aplica a animes en emisión. */
  airing?: AiringInfo | null;
  /**
   * Reloj compartido (ms) para refrescar la cuenta atrás sin un timer por tarjeta.
   * Si no se pasa (p. ej. en la búsqueda) la tarjeta usa siempre el formato normal.
   */
  now?: number;
  onPress: () => void;
  /** Si se omite, la tarjeta no muestra el menú de tres puntos. */
  onMenu?: () => void;
}

/** Tarjeta de la lista Home: portada, título, fechas, progreso y menú. */
export function AnimeListCard({ item, airing, now, onPress, onMenu }: Props) {
  const { node, list_status: listStatus } = item;
  const total = node.num_episodes ?? 0;
  const watched = listStatus.num_episodes_watched;
  const progress = total > 0 ? Math.min(watched / total, 1) : 0;

  // Sin datos de AniList un anime en emisión muestra emitidos "?"; si AniList dice
  // que ya salió el último episodio (state null) vuelve al formato normal.
  const isAiring = now !== undefined && node.status === 'currently_airing';
  const state = isAiring && airing && now !== undefined ? resolveAiringState(airing, total, now) : null;
  const showAiring = isAiring && (!airing || state !== null);
  // La nota solo se muestra en los completados y si se puntuó (0 = sin puntuar).
  const score = listStatus.status === 'completed' ? listStatus.score : 0;
  const totalLabel = total > 0 ? String(total) : '?';
  const progressLabel = showAiring
    ? `${watched}/${state ? state.aired : '?'}/${totalLabel}`
    : `${watched}/${totalLabel}`;

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
          {onMenu ? (
            <Pressable onPress={onMenu} hitSlop={10} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={18} color={AppColors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.dates}>{formatDateRange(node.start_date, node.end_date)}</Text>
        <View style={styles.progressBlock}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{progressLabel}</Text>
            {state ? (
              <Text style={styles.nextEpisode} numberOfLines={1}>
                Ep {state.episode} · {state.availableNow ? 'Ya disponible' : formatCountdown(state.msLeft)}
              </Text>
            ) : score > 0 ? (
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor(score) }]}>
                <Text style={styles.scoreText}>{score}</Text>
                <Ionicons name="star" size={13} color="#fff" />
              </View>
            ) : null}
          </View>
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
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressText: { color: AppColors.textMuted, fontSize: 13 },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  scoreText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  nextEpisode: { color: AppColors.accent, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: AppColors.progressTrack,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: AppColors.accent },
});
