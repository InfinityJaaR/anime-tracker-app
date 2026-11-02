import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimeResultCard } from '@/components/anime-result-card';
import { AppColors } from '@/constants/theme';
import type { AdvancedFilters } from '@/lib/api/jikan';
import { GENRES } from '@/lib/genres';
import { useAdvancedSearch, useMyList } from '@/lib/queries';

const TYPES = [
  { value: 'tv', label: 'TV' },
  { value: 'movie', label: 'Películas' },
  { value: 'special', label: 'Especiales' },
];
const SCORES = [9, 8, 7, 6, 5, 4, 3, 2, 1];
const YEARS = [2020, 2015, 2010, 2005, 2000, 1995];
const MIN_EPISODES = [40, 20, 12];

const EMPTY: AdvancedFilters = { type: null, minScore: null, genres: [], fromYear: null };

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipsRow}>{children}</View>
      </ScrollView>
    </View>
  );
}

export default function AdvancedSearchScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<AdvancedFilters>(EMPTY);
  const [minEpisodes, setMinEpisodes] = useState<number | null>(null);
  /** Filtros ya enviados con "Buscar"; hasta entonces no se consulta nada. */
  const [applied, setApplied] = useState<AdvancedFilters | null>(null);
  const [appliedEpisodes, setAppliedEpisodes] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const query = useAdvancedSearch(applied ?? EMPTY, applied !== null);
  const listQuery = useMyList('all');
  const myIds = useMemo(
    () => new Set((listQuery.data ?? []).map((item) => item.node.id)),
    [listQuery.data],
  );

  const results = useMemo(() => {
    const seen = new Set<number>();
    return (query.data?.pages ?? [])
      .flatMap((page) => page.data)
      .filter((anime) => {
        if (seen.has(anime.mal_id)) return false;
        seen.add(anime.mal_id);
        // La API no filtra por episodios mínimos: se aplica sobre lo cargado.
        return appliedEpisodes === null || (anime.episodes ?? 0) >= appliedEpisodes;
      });
  }, [query.data, appliedEpisodes]);

  const toggleGenre = (id: number) =>
    setDraft((d) => ({
      ...d,
      genres: d.genres.includes(id) ? d.genres.filter((g) => g !== id) : [...d.genres, id],
    }));

  const search = () => {
    setApplied(draft);
    setAppliedEpisodes(minEpisodes);
    setShowFilters(false);
  };
  const reset = () => {
    setDraft(EMPTY);
    setMinEpisodes(null);
  };

  const hasFilters =
    draft.type !== null ||
    draft.minScore !== null ||
    draft.genres.length > 0 ||
    draft.fromYear !== null ||
    minEpisodes !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={AppColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Búsqueda avanzada</Text>
        <Pressable onPress={() => setShowFilters((v) => !v)} hitSlop={12}>
          <Ionicons name="options" size={24} color={showFilters ? AppColors.accent : AppColors.text} />
        </Pressable>
      </View>

      {showFilters ? (
        <ScrollView style={styles.filters} contentContainerStyle={styles.filtersContent}>
          <Section title="Tipo">
            {TYPES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                active={draft.type === t.value}
                onPress={() => setDraft((d) => ({ ...d, type: d.type === t.value ? null : t.value }))}
              />
            ))}
          </Section>
          <Section title="Puntuación mínima">
            {SCORES.map((n) => (
              <Chip
                key={n}
                label={String(n)}
                active={draft.minScore === n}
                onPress={() => setDraft((d) => ({ ...d, minScore: d.minScore === n ? null : n }))}
              />
            ))}
          </Section>
          <Section title="Géneros">
            {GENRES.map((g) => (
              <Chip
                key={g.id}
                label={g.label}
                active={draft.genres.includes(g.id)}
                onPress={() => toggleGenre(g.id)}
              />
            ))}
          </Section>
          <Section title="Año de inicio (desde)">
            {YEARS.map((y) => (
              <Chip
                key={y}
                label={String(y)}
                active={draft.fromYear === y}
                onPress={() => setDraft((d) => ({ ...d, fromYear: d.fromYear === y ? null : y }))}
              />
            ))}
          </Section>
          <Section title="Episodios mínimos">
            {MIN_EPISODES.map((n) => (
              <Chip
                key={n}
                label={String(n)}
                active={minEpisodes === n}
                onPress={() => setMinEpisodes((current) => (current === n ? null : n))}
              />
            ))}
          </Section>

          <View style={styles.actions}>
            {hasFilters ? (
              <Pressable onPress={reset} hitSlop={8}>
                <Text style={styles.resetText}>LIMPIAR</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.searchButton} onPress={search}>
              <Text style={styles.searchText}>BUSCAR</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}

      {applied === null ? (
        !showFilters ? null : (
          <Text style={styles.hint}>Elige algunos filtros y pulsa Buscar.</Text>
        )
      ) : query.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={AppColors.accent} size="large" />
        </View>
      ) : query.isError && results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No se pudo buscar</Text>
          <Pressable style={styles.searchButton} onPress={() => query.refetch()}>
            <Text style={styles.searchText}>REINTENTAR</Text>
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
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator color={AppColors.accent} style={styles.footer} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Sin resultados con esos filtros.</Text>
            </View>
          }
        />
      )}
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
  headerTitle: { flex: 1, color: AppColors.text, fontSize: 22, fontWeight: '700' },
  filters: { flexGrow: 0, maxHeight: '62%' },
  filtersContent: { paddingBottom: 12 },
  section: { paddingTop: 10 },
  sectionTitle: { color: AppColors.text, fontSize: 17, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  chip: {
    borderWidth: 1.5,
    borderColor: AppColors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: AppColors.accent },
  chipText: { color: AppColors.text, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  resetText: { color: AppColors.textMuted, fontSize: 14, fontWeight: '700' },
  searchButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 24,
  },
  searchText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  hint: { color: AppColors.textMuted, fontSize: 14, textAlign: 'center', padding: 24 },
  listContent: { paddingBottom: 24, paddingTop: 6 },
  footer: { paddingVertical: 16 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle: { color: AppColors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: AppColors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
