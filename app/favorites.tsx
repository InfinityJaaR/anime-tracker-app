import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimeListCard } from '@/components/anime-list-card';
import { CharacterCard } from '@/components/character-card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FilterChip, FilterSheet, type FilterOption } from '@/components/filter-chips';
import { LoginButton } from '@/components/login-button';
import { StatusTabs, type StatusTab } from '@/components/status-tabs';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth/auth-context';
import { groupByAnime } from '@/lib/favorites';
import { useFavorites } from '@/lib/favorites-context';
import { useMyList } from '@/lib/queries';

type FavoritesTab = 'shows' | 'characters';
type CharacterSort = 'recent' | 'name' | 'anime';

/** Una serie es favorita si la completaste con nota verde (8–10). */
const FAVORITE_MIN_SCORE = 8;

const SORT_OPTIONS: FilterOption[] = [
  { value: 'recent', label: 'Añadidos recientemente' },
  { value: 'name', label: 'Nombre (A–Z)' },
  { value: 'anime', label: 'Por anime' },
];

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites, remove, clear } = useFavorites();
  const { isAuthenticated } = useAuth();
  const listQuery = useMyList('all');
  const [tab, setTab] = useState<FavoritesTab>('shows');
  const [sort, setSort] = useState<CharacterSort>('recent');
  const [sortSheet, setSortSheet] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  const groups = useMemo(() => {
    const grouped = groupByAnime(favorites);
    return sort === 'anime' ? grouped.sort((a, b) => a.animeTitle.localeCompare(b.animeTitle)) : grouped;
  }, [favorites, sort]);
  const charactersByName = useMemo(
    () => [...favorites].sort((a, b) => a.name.localeCompare(b.name)),
    [favorites],
  );

  const favoriteShows = useMemo(
    () =>
      (listQuery.data ?? [])
        .filter(
          (item) =>
            item.list_status.status === 'completed' && item.list_status.score >= FAVORITE_MIN_SCORE,
        )
        .sort(
          (a, b) =>
            b.list_status.score - a.list_status.score || a.node.title.localeCompare(b.node.title),
        ),
    [listQuery.data],
  );

  const tabs: StatusTab<FavoritesTab>[] = [
    { key: 'shows', label: 'Series', count: isAuthenticated ? favoriteShows.length : undefined },
    { key: 'characters', label: 'Personajes', count: favorites.length },
  ];

  const confirmRemove = (id: number, name: string) => {
    setConfirm({
      title: 'Quitar de favoritos',
      message: `¿Quitar a ${name} de tus favoritos?`,
      confirmLabel: 'QUITAR',
      onConfirm: () => remove(id),
    });
  };

  const confirmClear = () => {
    setConfirm({
      title: 'Vaciar favoritos',
      message: `Se quitarán ${favorites.length} personajes.`,
      confirmLabel: 'VACIAR',
      onConfirm: () => clear(),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={AppColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Favoritos</Text>
        {tab === 'characters' && favorites.length > 0 ? (
          <Pressable onPress={confirmClear} hitSlop={10}>
            <Ionicons name="trash-outline" size={22} color={AppColors.textMuted} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <StatusTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'shows' ? (
        !isAuthenticated ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={56} color={AppColors.textMuted} />
            <Text style={styles.emptyText}>
              Inicia sesión con MyAnimeList para ver tus series favoritas: las que completaste con
              nota de 8 a 10.
            </Text>
            <LoginButton />
          </View>
        ) : listQuery.isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={AppColors.accent} size="large" />
          </View>
        ) : (
          <FlatList
            data={favoriteShows}
            keyExtractor={(item) => String(item.node.id)}
            renderItem={({ item }) => (
              <AnimeListCard item={item} onPress={() => router.push(`/anime/${item.node.id}`)} />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Aún no tienes series con nota de 8 a 10 en Completed.
                </Text>
              </View>
            }
          />
        )
      ) : (
        <>
      {favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={56} color={AppColors.textMuted} />
          <Text style={styles.emptyTitle}>Todavía no tienes favoritos</Text>
          <Text style={styles.emptyText}>
            Abre cualquier anime y toca el corazón sobre un personaje para guardarlo aquí. Se
            guardan en este dispositivo, porque MyAnimeList no permite editar favoritos desde su
            API.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sortRow}>
            <FilterChip
              label={SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Ordenar'}
              active={sort !== 'recent'}
              onPress={() => setSortSheet(true)}
            />
          </View>
          <Text style={styles.counter}>
            {favorites.length} {favorites.length === 1 ? 'personaje' : 'personajes'} en{' '}
            {groups.length} {groups.length === 1 ? 'anime' : 'animes'}
          </Text>
          {sort === 'name' ? (
            <View style={styles.grid}>
              {charactersByName.map((character) => (
                <CharacterCard
                  key={character.id}
                  name={character.name}
                  imageUrl={character.imageUrl}
                  favorite
                  onToggleFavorite={() => confirmRemove(character.id, character.name)}
                  width={100}
                />
              ))}
            </View>
          ) : null}
          {sort !== 'name' && groups.map((group) => (
            <View key={group.animeId} style={styles.group}>
              <Pressable
                style={styles.groupHeader}
                onPress={() => router.push(`/anime/${group.animeId}`)}>
                <Text style={styles.groupTitle} numberOfLines={1}>
                  {group.animeTitle}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={AppColors.textMuted} />
              </Pressable>
              <View style={styles.grid}>
                {group.characters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    name={character.name}
                    imageUrl={character.imageUrl}
                    favorite
                    onToggleFavorite={() => confirmRemove(character.id, character.name)}
                    width={100}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

        </>
      )}

      <FilterSheet
        visible={sortSheet}
        title="Ordenar personajes"
        options={SORT_OPTIONS}
        value={sort}
        onClose={() => setSortSheet(false)}
        onSelect={(value) => setSort((value as CharacterSort) ?? 'recent')}
      />

      <ConfirmDialog
        visible={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel ?? ''}
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
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
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { color: AppColors.text, fontSize: 20, fontWeight: '700', flex: 1 },
  headerSpacer: { width: 22 },
  listContent: { paddingBottom: 24, paddingTop: 4 },
  sortRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8 },
  scrollContent: { paddingBottom: 32 },
  counter: { color: AppColors.textMuted, fontSize: 13, paddingHorizontal: 16, paddingBottom: 8 },
  group: { marginTop: 8 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  groupTitle: { color: AppColors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { color: AppColors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: AppColors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
