import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionMenu } from '@/components/action-menu';
import { AnimeListCard } from '@/components/anime-list-card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { LoginButton } from '@/components/login-button';
import { StatusTabs, type StatusTab } from '@/components/status-tabs';
import { MenuButton } from '@/components/menu-button';
import { AppColors } from '@/constants/theme';
import { saveWatchingAiring, syncEpisodeNotifications } from '@/lib/airing-notifications';
import type { MalListItem, MalWatchStatus } from '@/lib/api/mal';
import { useAuth } from '@/lib/auth/auth-context';
import {
  useAiringSchedule,
  useDeleteFromList,
  useMyList,
  useUpdateListStatus,
  type ListFilter,
} from '@/lib/queries';

const STATUS_ORDER: { key: ListFilter; label: string }[] = [
  { key: 'watching', label: 'Watching' },
  { key: 'plan_to_watch', label: 'Plan to Watch' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
  { key: 'dropped', label: 'Dropped' },
  { key: 'all', label: 'All' },
];

interface PendingConfirm {
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, user, signOut, restoreError } = useAuth();
  const [activeFilter, setActiveFilter] = useState<ListFilter>('watching');
  const [menuItem, setMenuItem] = useState<MalListItem | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const pagerRef = useRef<PagerView>(null);

  // Se descarga la lista completa una sola vez y se filtra en cliente:
  // así los contadores de cada tab son exactos con una sola consulta.
  const allQuery = useMyList('all');
  const updateMutation = useUpdateListStatus();
  const deleteMutation = useDeleteFromList();

  // Calendario de AniList para los animes en emisión de la lista.
  const airingIds = useMemo(
    () =>
      (allQuery.data ?? [])
        .filter((item) => item.node.status === 'currently_airing')
        .map((item) => item.node.id),
    [allQuery.data],
  );
  const airingQuery = useAiringSchedule(airingIds);
  const airingSchedule = airingQuery.data;

  // Reloj compartido por todas las tarjetas para refrescar la cuenta atrás.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Al pasar la hora de un episodio se pide el calendario real a AniList (una vez por hora de
  // emisión) para reemplazar la estimación semanal por el dato confirmado.
  const refetchedAt = useRef(new Set<string>());
  useEffect(() => {
    if (!airingSchedule) return;
    for (const [id, info] of Object.entries(airingSchedule)) {
      const key = `${id}-${info.airingAt}`;
      if (info.airingAt <= now && !refetchedAt.current.has(key)) {
        refetchedAt.current.add(key);
        void airingQuery.refetch();
      }
    }
  }, [airingSchedule, now, airingQuery]);

  // Avisos de "ya salió el episodio" solo para los que están en Watching.
  useEffect(() => {
    if (!airingSchedule) return;
    const entries = (allQuery.data ?? [])
      .filter(
        (item) =>
          item.list_status.status === 'watching' && item.node.status === 'currently_airing',
      )
      .map((item) => ({
        malId: item.node.id,
        title: item.node.title,
        totalEpisodes: item.node.num_episodes ?? 0,
      }));
    saveWatchingAiring(entries);
    syncEpisodeNotifications(entries, airingSchedule).catch(() => {});
  }, [allQuery.data, airingSchedule]);

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

  const itemsFor = (key: ListFilter) =>
    key === 'all' ? (allQuery.data ?? []) : (itemsByStatus.get(key) ?? []);

  const activeIndex = STATUS_ORDER.findIndex((status) => status.key === activeFilter);

  /** Toque en una pestaña: mueve el pager, que a su vez confirma el estado. */
  const goToTab = (key: ListFilter) => {
    const index = STATUS_ORDER.findIndex((status) => status.key === key);
    const adjacent = Math.abs(index - activeIndex) === 1;
    setActiveFilter(key);
    // El rAF deja montar la página destino antes del salto, y además evita el
    // UIViewControllerHierarchyInconsistency de iOS que documenta la librería.
    requestAnimationFrame(() => {
      if (adjacent) pagerRef.current?.setPage(index);
      else pagerRef.current?.setPageWithoutAnimation(index);
    });
  };

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
    // El ActionMenu aún se está cerrando: abrir otro Modal en el mismo frame
    // falla de forma intermitente en Android.
    requestAnimationFrame(() =>
      setConfirm({
        title: 'Eliminar anime',
        message: `¿Quitar "${item.node.title}" de tu lista?`,
        confirmLabel: 'ELIMINAR',
        onConfirm: () => deleteMutation.mutate(item.node.id),
      }),
    );
  };

  const confirmSignOut = () => {
    setConfirm({
      title: 'Cerrar sesión',
      message: user ? `Se cerrará la sesión de ${user.name}.` : undefined,
      confirmLabel: 'CERRAR SESIÓN',
      onConfirm: () => signOut(),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MenuButton />
          <Text style={styles.headerTitle}>Home</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable hitSlop={12} onPress={() => router.push('/search')}>
            <Ionicons name="search" size={25} color={AppColors.text} />
          </Pressable>
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
              <LoginButton />
              <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/discover')}>
                <Text style={styles.secondaryButtonText}>Descubrir animes</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <>
          <StatusTabs tabs={tabs} active={activeFilter} onChange={goToTab} />
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
            <PagerView
              ref={pagerRef}
              style={styles.pager}
              initialPage={activeIndex}
              offscreenPageLimit={1}
              onPageSelected={(e) =>
                setActiveFilter(STATUS_ORDER[e.nativeEvent.position].key)
              }>
              {STATUS_ORDER.map(({ key }, index) => (
                // collapsable={false} es obligatorio en Android: si no, RN puede
                // eliminar la View y tratar sus hijos como páginas separadas.
                <View key={key} style={styles.page} collapsable={false}>
                  {/* Solo la página activa y sus vecinas montan la lista, para no
                      disparar seis lotes de imágenes al abrir Home. */}
                  {Math.abs(index - activeIndex) <= 1 ? (
                    <FlatList
                      data={itemsFor(key)}
                      keyExtractor={(item) => String(item.node.id)}
                      renderItem={({ item }) => (
                        <AnimeListCard
                          item={item}
                          airing={airingSchedule?.[item.node.id]}
                          now={now}
                          onPress={() => router.push(`/anime/${item.node.id}`)}
                          onMenu={() => setMenuItem(item)}
                        />
                      )}
                      contentContainerStyle={styles.listContent}
                      extraData={now}
                      refreshing={allQuery.isRefetching}
                      onRefresh={() => allQuery.refetch()}
                      ListEmptyComponent={
                        <View style={styles.emptyState}>
                          <Text style={styles.emptyText}>No hay animes en esta lista.</Text>
                        </View>
                      }
                    />
                  ) : null}
                </View>
              ))}
            </PagerView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerTitle: { color: AppColors.text, fontSize: 24, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 18 },
  pager: { flex: 1 },
  // flex: 1 no funciona en los hijos del pager; hay que dimensionarlos al 100%.
  page: { width: '100%', height: '100%' },
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
