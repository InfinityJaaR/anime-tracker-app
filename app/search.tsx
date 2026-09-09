import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimeListCard } from '@/components/anime-list-card';
import { FilterChip, FilterSheet, type FilterOption } from '@/components/filter-chips';
import { AppColors } from '@/constants/theme';
import type { JikanAnime } from '@/lib/api/jikan';
import type { MalListItem } from '@/lib/api/mal';
import { useAuth } from '@/lib/auth/auth-context';
import { isoToDate } from '@/lib/format';
import { GENRES, genreById, MEDIA_TYPES, mediaTypeLabel } from '@/lib/genres';
import { useGlobalSearch, useMyList } from '@/lib/queries';

const GENRE_OPTIONS: FilterOption[] = [
  { value: null, label: 'Todos los géneros' },
  ...GENRES.map((g) => ({ value: g.name, label: g.label })),
];

const TYPE_OPTIONS: FilterOption[] = [
  { value: null, label: 'Todos los tipos' },
  ...MEDIA_TYPES.map((t) => ({ value: t.value, label: t.label })),
];

const SCORE_OPTIONS: FilterOption[] = [
  { value: null, label: 'Cualquier puntuación' },
  ...[9, 8, 7, 6, 5].map((n) => ({ value: String(n), label: `${n} o más` })),
];

export default function SearchScreen() {
  const router = useRouter();
  const { genre: genreParam } = useLocalSearchParams<{ genre?: string }>();
  const { isAuthenticated } = useAuth();

  const [input, setInput] = useState('');
  /** Texto ya enviado a MAL. Vacío = todavía no se ha buscado en general. */
  const [submitted, setSubmitted] = useState('');
  const [sheet, setSheet] = useState<'genre' | 'type' | 'score' | null>(null);
  const [genre, setGenre] = useState<string | null>(
    () => (genreParam ? (genreById(Number(genreParam))?.name ?? null) : null),
  );
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [minScore, setMinScore] = useState<string | null>(null);
  const [hideAdded, setHideAdded] = useState(false);

  const myListQuery = useMyList('all');
  const globalQuery = useGlobalSearch(submitted);

  // Con sesión, escribir filtra tu lista al instante y solo se va a MAL al enviar.
  // Sin sesión no hay lista local, así que se busca en MAL con un rebote.
  const isLocalMode = isAuthenticated && submitted.length === 0;

  useEffect(() => {
    if (isAuthenticated) return;
    const timer = setTimeout(() => setSubmitted(input.trim()), 400);
    return () => clearTimeout(timer);
  }, [input, isAuthenticated]);

  // Si el usuario llegó por un género y no ha escrito nada, se muestra su lista
  // (o nada sin sesión) hasta que busque; el filtro ya queda aplicado.
  const myIds = useMemo(
    () => new Set((myListQuery.data ?? []).map((item) => item.node.id)),
    [myListQuery.data],
  );

  const localResults = useMemo(() => {
    const items = myListQuery.data ?? [];
    const needle = input.trim().toLowerCase();
    return items.filter((item) => {
      if (needle && !matchesTitle(item, needle)) return false;
      return passesFilters(
        (item.node.genres ?? []).map((g) => g.name),
        item.node.media_type,
        item.node.mean,
        { genre, mediaType, minScore },
      );
    });
  }, [myListQuery.data, input, genre, mediaType, minScore]);

  const globalResults = useMemo(() => {
    const items = globalQuery.data?.data ?? [];
    return items.filter((anime) => {
      if (hideAdded && isAuthenticated && myIds.has(anime.mal_id)) return false;
      return passesFilters(
        (anime.genres ?? []).map((g) => g.name),
        anime.type,
        anime.score,
        { genre, mediaType, minScore },
      );
    });
  }, [globalQuery.data, hideAdded, isAuthenticated, myIds, genre, mediaType, minScore]);

  const activeFilters = [genre, mediaType, minScore].filter(Boolean).length;

  const runGlobalSearch = () => {
    const trimmed = input.trim();
    if (trimmed.length >= 2) setSubmitted(trimmed);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={AppColors.accent} />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Buscar"
          placeholderTextColor={AppColors.textMuted}
          value={input}
          onChangeText={(text) => {
            setInput(text);
            // Volver al modo local en cuanto se reescribe.
            if (isAuthenticated) setSubmitted('');
          }}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={runGlobalSearch}
        />
        {input.length > 0 ? (
          <Pressable
            onPress={() => {
              setInput('');
              setSubmitted('');
            }}
            hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={AppColors.textMuted} />
          </Pressable>
        ) : null}
        <Pressable onPress={runGlobalSearch} hitSlop={12}>
          <Ionicons name="search" size={24} color={AppColors.accent} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filtersRow}>
          <FilterChip
            label={genre ? (GENRES.find((g) => g.name === genre)?.label ?? genre) : 'Género'}
            active={!!genre}
            onPress={() => setSheet('genre')}
          />
          <FilterChip
            label={mediaType ? mediaTypeLabel(mediaType) : 'Tipo de serie'}
            active={!!mediaType}
            onPress={() => setSheet('type')}
          />
          <FilterChip
            label={minScore ? `${minScore} o más` : 'Puntuación mínima'}
            active={!!minScore}
            onPress={() => setSheet('score')}
          />
          {activeFilters > 0 ? (
            <Pressable
              style={styles.clearFilters}
              onPress={() => {
                setGenre(null);
                setMediaType(null);
                setMinScore(null);
              }}>
              <Text style={styles.clearFiltersText}>Limpiar</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {isAuthenticated && !isLocalMode ? (
        <Pressable style={styles.checkboxRow} onPress={() => setHideAdded((v) => !v)}>
          <Ionicons
            name={hideAdded ? 'checkbox' : 'square-outline'}
            size={22}
            color={hideAdded ? AppColors.accent : AppColors.textMuted}
          />
          <Text style={styles.checkboxLabel}>Ocultar los que ya tengo en mi lista</Text>
        </Pressable>
      ) : null}

      {isLocalMode ? (
        <FlatList
          data={localResults}
          keyExtractor={(item) => String(item.node.id)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.modeHint}>
              Buscando en tu lista. Pulsa la lupa o Enter para buscar en todo MyAnimeList.
            </Text>
          }
          ListEmptyComponent={
            myListQuery.isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={AppColors.accent} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {input.trim()
                    ? `Nada en tu lista para “${input.trim()}”. Pulsa la lupa para buscar en MAL.`
                    : 'Tu lista está vacía o no coincide con los filtros.'}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <AnimeListCard
              item={item}
              onPress={() => router.push(`/anime/${item.node.id}`)}
              onMenu={() => router.push(`/anime/${item.node.id}`)}
            />
          )}
        />
      ) : globalQuery.isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={AppColors.accent} size="large" />
        </View>
      ) : globalQuery.isError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Error al buscar</Text>
          <Text style={styles.emptyText}>{String(globalQuery.error)}</Text>
          <Pressable style={styles.retryButton} onPress={() => globalQuery.refetch()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={globalResults}
          keyExtractor={(item) => String(item.mal_id)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={44} color={AppColors.textMuted} />
              <Text style={styles.emptyText}>
                {submitted
                  ? `Sin resultados para “${submitted}”${activeFilters ? ' con esos filtros' : ''}.`
                  : 'Escribe al menos 2 caracteres para buscar en MyAnimeList.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <GlobalResultCard
              anime={item}
              alreadyAdded={isAuthenticated && myIds.has(item.mal_id)}
              onPress={() => router.push(`/anime/${item.mal_id}`)}
            />
          )}
        />
      )}

      <FilterSheet
        visible={sheet === 'genre'}
        title="Género"
        options={GENRE_OPTIONS}
        value={genre}
        onClose={() => setSheet(null)}
        onSelect={setGenre}
      />
      <FilterSheet
        visible={sheet === 'type'}
        title="Tipo de serie"
        options={TYPE_OPTIONS}
        value={mediaType}
        onClose={() => setSheet(null)}
        onSelect={setMediaType}
      />
      <FilterSheet
        visible={sheet === 'score'}
        title="Puntuación mínima"
        options={SCORE_OPTIONS}
        value={minScore}
        onClose={() => setSheet(null)}
        onSelect={setMinScore}
      />
    </SafeAreaView>
  );
}

/** Busca en el título principal y también en el inglés y los sinónimos. */
function matchesTitle(item: MalListItem, needle: string): boolean {
  const alt = item.node.alternative_titles;
  const candidates = [item.node.title, alt?.en, alt?.ja, ...(alt?.synonyms ?? [])];
  return candidates.some((title) => title?.toLowerCase().includes(needle));
}

interface Filters {
  genre: string | null;
  mediaType: string | null;
  minScore: string | null;
}

/** Los filtros se aplican en cliente porque MAL no acepta filtrar por género. */
function passesFilters(
  genres: string[],
  type: string | null | undefined,
  score: number | null | undefined,
  filters: Filters,
): boolean {
  if (filters.genre && !genres.includes(filters.genre)) return false;
  if (filters.mediaType && (type ?? '').toLowerCase() !== filters.mediaType) return false;
  if (filters.minScore && (score ?? 0) < Number(filters.minScore)) return false;
  return true;
}

function GlobalResultCard({
  anime,
  alreadyAdded,
  onPress,
}: {
  anime: JikanAnime;
  alreadyAdded: boolean;
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
  container: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  input: { flex: 1, color: AppColors.text, fontSize: 17, paddingVertical: 0 },
  filtersScroll: { flexGrow: 0 },
  filtersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  clearFilters: { justifyContent: 'center', paddingHorizontal: 6 },
  clearFiltersText: { color: AppColors.textMuted, fontSize: 13, fontWeight: '600' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  checkboxLabel: { color: AppColors.text, fontSize: 14 },
  modeHint: {
    color: AppColors.textMuted,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 17,
  },
  listContent: { paddingBottom: 24 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
    paddingVertical: 48,
  },
  emptyTitle: { color: AppColors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: AppColors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
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
