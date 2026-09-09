import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionMenu } from '@/components/action-menu';
import { AnimeListCard } from '@/components/anime-list-card';
import { StatusTabs, type StatusTab } from '@/components/status-tabs';
import { AppColors } from '@/constants/theme';
import type { MalListItem, MalWatchStatus } from '@/lib/api/mal';
import { useAuth } from '@/lib/auth/auth-context';
import { useDeleteFromList, useMyList, useUpdateListStatus, type ListFilter } from '@/lib/queries';

const STATUS_ORDER: { key: ListFilter; label: string }[] = [
  { key: 'watching', label: 'Watching' },
  { key: 'plan_to_watch', label: 'Plan to Watch' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
  { key: 'dropped', label: 'Dropped' },
  { key: 'all', label: 'All' },
];

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, user, signOut, restoreError } = useAuth();
  const [activeFilter, setActiveFilter] = useState<ListFilter>('watching');
  const [menuItem, setMenuItem] = useState<MalListItem | null>(null);

  // Se descarga la lista completa una sola vez y se filtra en cliente:
  // así los contadores de cada tab son exactos con una sola consulta.
  const allQuery = useMyList('all');
  const updateMutation = useUpdateListStatus();
  const deleteMutation = useDeleteFromList();

  const itemsByStatus = useMemo(() => {
    const groups = new Map<MalWatchStatus, MalListItem[]>();
    for (const item of allQuery.data ?? []) {
      const group = groups.get(item.list_status.status) ?? [];
      group.push(item);
      groups.set(item.list_status.status, group);
    }
    return groups;
  }, [allQuery.data]);

  const tabs: StatusTab[] = useMemo(
    () =>
      STATUS_ORDER.map(({ key, label }) => ({
        key,
        label,
        count: allQuery.data
          ? key === 'all'
            ? allQuery.data.length
            : (itemsByStatus.get(key)?.length ?? 0)
          : undefined,
      })),
    [allQuery.data, itemsByStatus],
  );

  const visibleItems = useMemo(() => {
    if (activeFilter === 'all') return allQuery.data ?? [];
    return itemsByStatus.get(activeFilter) ?? [];
  }, [activeFilter, allQuery.data, itemsByStatus]);

  const plusOneEpisode = (item: MalListItem) => {
    const total = item.node.num_episodes ?? 0;
    const next = item.list_status.num_episodes_watched + 1;
    if (total > 0 && next > total) return;
    updateMutation.mutate({
      animeId: item.node.id,
      params: {
        num_watched_episodes: next,
        // Al completar todos los episodios, marcar como Completed.
        ...(total > 0 && next === total ? { status: 'completed' as const } : {}),
      },
    });
  };

  const confirmDelete = (item: MalListItem) => {
    Alert.alert('Eliminar anime', `¿Quitar "${item.node.title}" de tu lista?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(item.node.id) },
    ]);
  };

  const confirmSignOut = () => {
    Alert.alert('Cerrar sesión', user ? `Sesión de ${user.name}` : undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
        <View style={styles.headerActions}>
          {isAuthenticated ? (
            <>
              <Pressable
                hitSlop={10}
                onPress={() => queryClient.invalidateQueries({ queryKey: ['mal'] })}>
                <Ionicons name="refresh" size={24} color={AppColors.text} />
              </Pressable>
              <Pressable hitSlop={10} onPress={confirmSignOut}>
                <Ionicons name="person-circle-outline" size={26} color={AppColors.text} />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      {!isAuthenticated ? (
        <View style={styles.emptyState}>
          {authLoading ? (
            <ActivityIndicator color={AppColors.accent} size="large" />
          ) : (
            <>
              <Ionicons name="library-outline" size={56} color={AppColors.textMuted} />
              <Text style={styles.emptyTitle}>Tus listas viven en MyAnimeList</Text>
              <Text style={styles.emptyText}>
                Inicia sesión con tu cuenta de MAL para ver y actualizar tus animes. Mientras tanto
                puedes buscar y explorar sin cuenta.
              </Text>
              {restoreError ? <Text style={styles.restoreError}>{restoreError}</Text> : null}
              <Pressable style={styles.loginButton} onPress={() => router.push('/login')}>
                <Text style={styles.loginButtonText}>Iniciar sesión con MAL</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/discover')}>
                <Text style={styles.secondaryButtonText}>Descubrir animes</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <>
          <StatusTabs tabs={tabs} active={activeFilter} onChange={setActiveFilter} />
          {allQuery.isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={AppColors.accent} size="large" />
              <Text style={styles.emptyText}>Cargando tu lista de MAL…</Text>
            </View>
          ) : allQuery.isError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No se pudo cargar tu lista</Text>
              <Text style={styles.emptyText}>{String(allQuery.error)}</Text>
              <Pressable style={styles.loginButton} onPress={() => allQuery.refetch()}>
                <Text style={styles.loginButtonText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={visibleItems}
              keyExtractor={(item) => String(item.node.id)}
              renderItem={({ item }) => (
                <AnimeListCard
                  item={item}
                  onPress={() => router.push(`/anime/${item.node.id}`)}
                  onMenu={() => setMenuItem(item)}
                />
              )}
              contentContainerStyle={styles.listContent}
              refreshing={allQuery.isRefetching}
              onRefresh={() => allQuery.refetch()}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No hay animes en esta lista.</Text>
                </View>
              }
            />
          )}
        </>
      )}

      <ActionMenu
        visible={menuItem !== null}
        onClose={() => setMenuItem(null)}
        actions={
          menuItem
            ? [
                { label: '+1 Episode', onPress: () => plusOneEpisode(menuItem) },
                { label: 'Open', onPress: () => router.push(`/anime/${menuItem.node.id}`) },
                {
                  label: 'Copy Title To Clipboard',
                  onPress: () => Clipboard.setStringAsync(menuItem.node.title),
                },
                { label: 'Delete', destructive: true, onPress: () => confirmDelete(menuItem) },
              ]
            : []
        }
      />
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
  headerActions: { flexDirection: 'row', gap: 18 },
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
  restoreError: { color: AppColors.danger, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  loginButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  loginButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: { color: AppColors.accent, fontSize: 15, fontWeight: '600' },
});
