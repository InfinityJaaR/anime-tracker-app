import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterCard } from '@/components/character-card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AppColors } from '@/constants/theme';
import { useFavorites } from '@/lib/favorites-context';
import { groupByAnime } from '@/lib/favorites';

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites, remove, clear } = useFavorites();
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  const groups = useMemo(() => groupByAnime(favorites), [favorites]);

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
        <Text style={styles.headerTitle}>Personajes favoritos</Text>
        {favorites.length > 0 ? (
          <Pressable onPress={confirmClear} hitSlop={10}>
            <Ionicons name="trash-outline" size={22} color={AppColors.textMuted} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

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
          <Text style={styles.counter}>
            {favorites.length} {favorites.length === 1 ? 'personaje' : 'personajes'} en{' '}
            {groups.length} {groups.length === 1 ? 'anime' : 'animes'}
          </Text>
          {groups.map((group) => (
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
