import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import type { JikanAnime } from '@/lib/api/jikan';
import { isoToDate } from '@/lib/format';
import { useSearchAnime } from '@/lib/queries';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const searchQuery = useSearchAnime(query);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buscar</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={AppColors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Buscar anime…"
          placeholderTextColor={AppColors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={AppColors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {query.trim().length < 2 ? (
        <View style={styles.emptyState}>
          <Ionicons name="compass-outline" size={48} color={AppColors.textMuted} />
          <Text style={styles.emptyText}>
            Escribe al menos 2 caracteres para buscar. No necesitas iniciar sesión.
          </Text>
        </View>
      ) : searchQuery.isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={AppColors.accent} size="large" />
        </View>
      ) : searchQuery.isError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Error al buscar</Text>
          <Text style={styles.emptyText}>{String(searchQuery.error)}</Text>
          <Pressable style={styles.retryButton} onPress={() => searchQuery.refetch()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={searchQuery.data?.data ?? []}
          keyExtractor={(item) => String(item.mal_id)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Sin resultados para “{query.trim()}”.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <SearchResultCard
              anime={item}
              onPress={() => router.push(`/anime/${item.mal_id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function SearchResultCard({ anime, onPress }: { anime: JikanAnime; onPress: () => void }) {
  const imageUri = anime.images.jpg.large_image_url ?? anime.images.jpg.image_url;
  const airedFrom = isoToDate(anime.aired?.from);
  const airedTo = isoToDate(anime.aired?.to);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}>
      <Image source={{ uri: imageUri }} style={styles.cover} contentFit="cover" transition={150} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {anime.title}
        </Text>
        {anime.title_english && anime.title_english !== anime.title ? (
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {anime.title_english}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          {[anime.type, anime.episodes ? `${anime.episodes} eps` : null, anime.status]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {airedFrom || airedTo ? (
          <Text style={styles.meta}>
            {airedFrom ?? '?'} - {airedTo ?? '?'}
          </Text>
        ) : null}
        {anime.score ? (
          <Text style={styles.score}>★ {anime.score.toFixed(2)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { color: AppColors.text, fontSize: 24, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AppColors.surface,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    color: AppColors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  listContent: { paddingBottom: 24, paddingTop: 4 },
  emptyState: {
    flex: 1,
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
    marginTop: 8,
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
  cover: { width: 80, height: 110 },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center', gap: 3 },
  cardTitle: { color: AppColors.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  cardSubtitle: { color: AppColors.textMuted, fontSize: 13 },
  meta: { color: AppColors.textMuted, fontSize: 12 },
  score: { color: AppColors.accent, fontSize: 13, fontWeight: '600', marginTop: 2 },
});
