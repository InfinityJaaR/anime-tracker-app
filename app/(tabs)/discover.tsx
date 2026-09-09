import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimePosterCard } from '@/components/anime-poster-card';
import { DiscoverSection } from '@/components/discover-section';
import { AppColors } from '@/constants/theme';
import type { MalRankingType } from '@/lib/api/mal-public';
import { useAuth } from '@/lib/auth/auth-context';
import { GENRES, mediaTypeLabel } from '@/lib/genres';
import {
  useAnimeRanking,
  useCurrentSeason,
  useMyList,
  useRecentEpisodes,
} from '@/lib/queries';

const TOP_FILTERS: { key: MalRankingType; label: string }[] = [
  { key: 'tv', label: 'TV' },
  { key: 'upcoming', label: 'Próximos' },
  { key: 'airing', label: 'En emisión' },
  { key: 'movie', label: 'Películas' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [topFilter, setTopFilter] = useState<MalRankingType>('tv');

  const topQuery = useAnimeRanking(topFilter);
  const seasonQuery = useCurrentSeason();
  const recentQuery = useRecentEpisodes();
  // Reutiliza la lista completa que ya cachean Home y Stats en vez de pedir otra.
  const listQuery = useMyList('all');
  const watching = useMemo(
    () => (listQuery.data ?? []).filter((item) => item.list_status.status === 'watching'),
    [listQuery.data],
  );

  const openAnime = (id: number) => router.push(`/anime/${id}`);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Descubrir</Text>
        <Pressable hitSlop={12} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={25} color={AppColors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Anime */}
        <View style={styles.topBlock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {TOP_FILTERS.map((filter) => {
                const active = filter.key === topFilter;
                return (
                  <Pressable
                    key={filter.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setTopFilter(filter.key)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <DiscoverSection
            title="Mejor valorados"
            isLoading={topQuery.isLoading}
            isError={topQuery.isError}
            isEmpty={!topQuery.data?.length}>
            {(topQuery.data ?? []).map((anime) => (
              <AnimePosterCard
                key={anime.mal_id}
                title={anime.title}
                imageUrl={anime.images.jpg.large_image_url ?? anime.images.jpg.image_url}
                score={anime.score}
                badge={mediaTypeLabel(anime.type)}
                onPress={() => openAnime(anime.mal_id)}
              />
            ))}
          </DiscoverSection>
        </View>

        {/* Temporada actual */}
        <DiscoverSection
          title="Temporada actual"
          isLoading={seasonQuery.isLoading}
          isError={seasonQuery.isError}
          isEmpty={!seasonQuery.data?.length}>
          {(seasonQuery.data ?? []).map((anime) => (
            <AnimePosterCard
              key={anime.mal_id}
              title={anime.title}
              imageUrl={anime.images.jpg.large_image_url ?? anime.images.jpg.image_url}
              score={anime.score}
              badge={mediaTypeLabel(anime.type)}
              onPress={() => openAnime(anime.mal_id)}
            />
          ))}
        </DiscoverSection>

        {/* Continúa viendo (solo con sesión) */}
        {isAuthenticated ? (
          <DiscoverSection
            title="Continúa viendo"
            isLoading={listQuery.isLoading}
            isError={listQuery.isError}
            isEmpty={!watching.length}
            emptyText="No tienes animes en curso ahora mismo.">
            {watching.map((item) => (
              <AnimePosterCard
                key={item.node.id}
                title={item.node.title}
                imageUrl={item.node.main_picture?.large ?? item.node.main_picture?.medium}
                caption={`${item.list_status.num_episodes_watched}/${
                  item.node.num_episodes && item.node.num_episodes > 0 ? item.node.num_episodes : '?'
                }`}
                onPress={() => openAnime(item.node.id)}
              />
            ))}
          </DiscoverSection>
        ) : null}

        {/* Explora por género */}
        <View style={styles.genresCard}>
          <Text style={styles.genresTitle}>Explora por género</Text>
          <View style={styles.genresWrap}>
            {GENRES.map((genre) => (
              <Pressable
                key={genre.id}
                style={styles.genreChip}
                onPress={() => router.push(`/search?genre=${genre.id}`)}>
                <Text style={styles.genreChipText}>{genre.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Episodios recientes */}
        <DiscoverSection
          title="Episodios recientes"
          isLoading={recentQuery.isLoading}
          isError={recentQuery.isError}
          isEmpty={!recentQuery.data?.length}>
          {(recentQuery.data ?? []).map((entry) => (
            <AnimePosterCard
              key={`${entry.entry.mal_id}-${entry.episodes[0]?.mal_id ?? 0}`}
              title={entry.entry.title}
              imageUrl={entry.entry.images.jpg.large_image_url ?? entry.entry.images.jpg.image_url}
              caption={entry.episodes[0]?.title ?? null}
              onPress={() => openAnime(entry.entry.mal_id)}
            />
          ))}
        </DiscoverSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { color: AppColors.text, fontSize: 24, fontWeight: '700' },
  scrollContent: { paddingBottom: 32 },
  topBlock: { gap: 0 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 4 },
  chip: {
    borderWidth: 1.5,
    borderColor: AppColors.accent,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  chipActive: { backgroundColor: AppColors.accent },
  chipText: { color: AppColors.accent, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  genresCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
  },
  genresTitle: { color: AppColors.text, fontSize: 17, fontWeight: '700', marginBottom: 10 },
  genresWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: {
    borderWidth: 1.5,
    borderColor: AppColors.accent,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  genreChipText: { color: AppColors.accent, fontSize: 13, fontWeight: '600' },
});
