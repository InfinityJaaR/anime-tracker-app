import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimeResultCard } from '@/components/anime-result-card';
import { GenrePickerModal } from '@/components/genre-picker-modal';
import { LoginButton } from '@/components/login-button';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth/auth-context';
import { useExcludedGenres } from '@/lib/excluded-genres';
import { GENRES } from '@/lib/genres';
import { useAnimeSuggestions, useMyList } from '@/lib/queries';

export default function RecommendationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [excluded, setExcluded] = useExcludedGenres();
  const [pickerOpen, setPickerOpen] = useState(false);

  const suggestionsQuery = useAnimeSuggestions();
  const listQuery = useMyList('all');
  const myIds = useMemo(
    () => new Set((listQuery.data ?? []).map((item) => item.node.id)),
    [listQuery.data],
  );
  const excludedNames = useMemo(
    () => excluded.map((id) => GENRES.find((g) => g.id === id)?.name).filter(Boolean) as string[],
    [excluded],
  );

  // Sin lo que ya está en tu lista ni los géneros que no te gustan.
  const results = useMemo(
    () =>
      (suggestionsQuery.data ?? []).filter((anime) => {
        if (myIds.has(anime.mal_id)) return false;
        return !(anime.genres ?? []).some((g) => excludedNames.includes(g.name));
      }),
    [suggestionsQuery.data, myIds, excludedNames],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={AppColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Recomendaciones</Text>
        <Pressable onPress={() => setPickerOpen(true)} hitSlop={10}>
          <Text style={styles.headerAction}>
            FILTRAR{excluded.length > 0 ? ` (${excluded.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {!isAuthenticated ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            Inicia sesión con MyAnimeList para ver recomendaciones según tu lista.
          </Text>
          <LoginButton />
        </View>
      ) : suggestionsQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={AppColors.accent} size="large" />
        </View>
      ) : suggestionsQuery.isError ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No se pudieron cargar las recomendaciones</Text>
          <Text style={styles.emptyText}>{String(suggestionsQuery.error)}</Text>
          <Pressable style={styles.retryButton} onPress={() => suggestionsQuery.refetch()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(anime) => String(anime.mal_id)}
          renderItem={({ item }) => (
            <AnimeResultCard anime={item} onPress={() => router.push(`/anime/${item.mal_id}`)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshing={suggestionsQuery.isRefetching}
          onRefresh={() => suggestionsQuery.refetch()}
          ListHeaderComponent={
            excluded.length === 0 ? (
              <Text style={styles.hint}>
                Puedes mejorar las recomendaciones indicando los géneros que no te gustan.
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                {(suggestionsQuery.data ?? []).length === 0
                  ? 'MyAnimeList aún no tiene sugerencias para tu lista. Puntúa más animes para recibirlas.'
                  : 'No quedan recomendaciones con tus filtros.'}
              </Text>
            </View>
          }
        />
      )}

      <GenrePickerModal
        visible={pickerOpen}
        title="Elige los géneros que no te gustan"
        value={excluded}
        onClose={() => setPickerOpen(false)}
        onConfirm={(ids) => {
          setExcluded(ids);
          setPickerOpen(false);
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
  headerTitle: { flex: 1, color: AppColors.text, fontSize: 22, fontWeight: '700' },
  headerAction: { color: AppColors.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  hint: { color: AppColors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 10 },
  listContent: { paddingBottom: 24, paddingTop: 4 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
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
