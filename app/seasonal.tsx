import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimeResultCard } from '@/components/anime-result-card';
import { FilterChip, FilterSheet, type FilterOption } from '@/components/filter-chips';
import { GenrePickerModal } from '@/components/genre-picker-modal';
import { AppColors } from '@/constants/theme';
import { seasonOf, type AnimeSeason } from '@/lib/api/mal-public';
import { GENRES } from '@/lib/genres';
import { useMyList, useSeasonAnime } from '@/lib/queries';

const SEASON_LABELS: Record<AnimeSeason, string> = {
  winter: 'Invierno',
  spring: 'Primavera',
  summer: 'Verano',
  fall: 'Otoño',
};
const SEASON_ORDER: AnimeSeason[] = ['winter', 'spring', 'summer', 'fall'];
const YEARS_BACK = 10;

interface SeasonRef {
  year: number;
  season: AnimeSeason;
}

const keyOf = ({ year, season }: SeasonRef) => `${year}-${season}`;
const labelOf = ({ year, season }: SeasonRef) => `${SEASON_LABELS[season]} ${year}`;

/** Desplaza una temporada `delta` posiciones (positivo = futuro). */
function shiftSeason({ year, season }: SeasonRef, delta: number): SeasonRef {
  const index = year * 4 + SEASON_ORDER.indexOf(season) + delta;
  return { year: Math.floor(index / 4), season: SEASON_ORDER[((index % 4) + 4) % 4] };
}

export default function SeasonalScreen() {
  const router = useRouter();
  const current = useMemo(() => seasonOf(new Date()), []);
  const [selected, setSelected] = useState<SeasonRef>(current);
  const [sheet, setSheet] = useState(false);
  const [genresOpen, setGenresOpen] = useState(false);
  const [genres, setGenres] = useState<number[]>([]);

  // Próxima temporada, la actual y las de los últimos 10 años.
  const options: FilterOption[] = useMemo(() => {
    const list: FilterOption[] = [];
    for (let delta = 1; delta >= -(YEARS_BACK * 4); delta--) {
      const ref = shiftSeason(current, delta);
      const suffix = delta === 0 ? ' (actual)' : delta === 1 ? ' (próxima)' : '';
      list.push({ value: keyOf(ref), label: `${labelOf(ref)}${suffix}` });
    }
    return list;
  }, [current]);

  const seasonQuery = useSeasonAnime(selected.year, selected.season);
  const listQuery = useMyList('all');
  const myIds = useMemo(
    () => new Set((listQuery.data ?? []).map((item) => item.node.id)),
    [listQuery.data],
  );

  const genreNames = useMemo(
    () => genres.map((id) => GENRES.find((g) => g.id === id)?.name).filter(Boolean) as string[],
    [genres],
  );
  const results = useMemo(() => {
    const seen = new Set<number>();
    return (seasonQuery.data?.pages ?? [])
      .flatMap((page) => page.data)
      .filter((anime) => {
        if (seen.has(anime.mal_id)) return false;
        seen.add(anime.mal_id);
        if (genreNames.length === 0) return true;
        const names = (anime.genres ?? []).map((g) => g.name);
        return genreNames.every((name) => names.includes(name));
      });
  }, [seasonQuery.data, genreNames]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={AppColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Temporadas</Text>
        <Pressable onPress={() => setGenresOpen(true)} hitSlop={10}>
          <Text style={styles.headerAction}>
            FILTRAR GÉNEROS{genres.length > 0 ? ` (${genres.length})` : ''}
          </Text>
        </Pressable>
      </View>

      <View style={styles.chipRow}>
        <FilterChip label={labelOf(selected)} active={keyOf(selected) !== keyOf(current)} onPress={() => setSheet(true)} />
      </View>

      {seasonQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={AppColors.accent} size="large" />
        </View>
      ) : seasonQuery.isError && results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No se pudo cargar la temporada</Text>
          <Pressable style={styles.retryButton} onPress={() => seasonQuery.refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(anime) => String(anime.mal_id)}
          renderItem={({ item }) => (
            <AnimeResultCard
              anime={item}
              alreadyAdded={myIds.has(item.mal_id)}
              onPress={() => router.push(`/anime/${item.mal_id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={() => {
            if (seasonQuery.hasNextPage && !seasonQuery.isFetchingNextPage) {
              void seasonQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            seasonQuery.isFetchingNextPage ? (
              <ActivityIndicator color={AppColors.accent} style={styles.footer} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                {genres.length > 0
                  ? 'Ningún anime cargado coincide con esos géneros.'
                  : 'No hay animes en esta temporada.'}
              </Text>
            </View>
          }
        />
      )}

      <FilterSheet
        visible={sheet}
        title="Temporada"
        options={options}
        value={keyOf(selected)}
        onClose={() => setSheet(false)}
        onSelect={(value) => {
          const [year, season] = (value ?? keyOf(current)).split('-');
          setSelected({ year: Number(year), season: season as AnimeSeason });
        }}
      />

      <GenrePickerModal
        visible={genresOpen}
        title="Elige géneros"
        value={genres}
        confirmLabel="OK"
        onClose={() => setGenresOpen(false)}
        onConfirm={(ids) => {
          setGenres(ids);
          setGenresOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { flex: 1, color: AppColors.text, fontSize: 24, fontWeight: '700' },
  headerAction: { color: AppColors.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10 },
  listContent: { paddingBottom: 24 },
  footer: { paddingVertical: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle: { color: AppColors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: AppColors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
