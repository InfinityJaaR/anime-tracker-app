import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarCard } from '@/components/calendar-card';
import { StatusTabs, type StatusTab } from '@/components/status-tabs';
import { MenuButton } from '@/components/menu-button';
import { AppColors } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useAuth } from '@/lib/auth/auth-context';
import {
  buildCalendar,
  CALENDAR_DAYS,
  weekdayOf,
  type CalendarEntry,
  type CalendarShow,
} from '@/lib/calendar';
import { useAiringSchedule, useAiringShows, useMyList } from '@/lib/queries';

type CalendarTab = 'all' | 'mine' | `${0 | 1 | 2 | 3 | 4 | 5 | 6}`;

const todayTab = (): CalendarTab => String(new Date().getDay()) as CalendarTab;

export default function CalendarScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const now = useNow();
  const [activeTab, setActiveTab] = useState<CalendarTab>(todayTab);
  const pagerRef = useRef<PagerView>(null);

  const seasonQuery = useAiringShows();
  // Reutiliza la lista completa que ya cachean Home, Descubrir y Stats.
  const listQuery = useMyList('all');

  // Animes de mi lista que están en emisión (los descartados no cuentan).
  const myShows = useMemo(
    () =>
      (listQuery.data ?? [])
        .filter(
          (item) => item.node.status === 'currently_airing' && item.list_status.status !== 'dropped',
        )
        .map(
          (item): CalendarShow => ({
            malId: item.node.id,
            title: item.node.title,
            imageUrl: item.node.main_picture?.large ?? item.node.main_picture?.medium,
          }),
        ),
    [listQuery.data],
  );

  const shows = useMemo(() => {
    const byId = new Map<number, CalendarShow>();
    for (const show of [...myShows, ...(seasonQuery.data ?? [])]) {
      if (!byId.has(show.malId)) byId.set(show.malId, show);
    }
    return [...byId.values()];
  }, [myShows, seasonQuery.data]);
  const malIds = useMemo(() => shows.map((show) => show.malId), [shows]);
  const scheduleQuery = useAiringSchedule(malIds);

  const entries = useMemo(
    () =>
      buildCalendar(shows, scheduleQuery.data, new Set(myShows.map((show) => show.malId)), now),
    [shows, scheduleQuery.data, myShows, now],
  );

  const tabs: StatusTab<CalendarTab>[] = useMemo(
    () => [
      { key: 'all', label: 'Todos', count: entries.length },
      ...(isAuthenticated
        ? [{ key: 'mine' as const, label: 'Mis series', count: entries.filter((e) => e.mine).length }]
        : []),
      ...CALENDAR_DAYS.map(({ day, label }) => ({
        key: String(day) as CalendarTab,
        label,
        count: entries.filter((e) => weekdayOf(e.airingAt) === day).length,
      })),
    ],
    [entries, isAuthenticated],
  );

  const entriesFor = (key: CalendarTab): CalendarEntry[] =>
    key === 'all'
      ? entries
      : key === 'mine'
        ? entries.filter((e) => e.mine)
        : entries.filter((e) => weekdayOf(e.airingAt) === Number(key));

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === activeTab),
  );

  /** Toque en una pestaña: mueve el pager, que a su vez confirma la pestaña activa. */
  const goToTab = (key: CalendarTab) => {
    const index = tabs.findIndex((tab) => tab.key === key);
    if (index < 0) return;
    const adjacent = Math.abs(index - activeIndex) === 1;
    setActiveTab(key);
    // El rAF deja montar la página destino antes del salto (mismo patrón que Home).
    requestAnimationFrame(() => {
      if (adjacent) pagerRef.current?.setPage(index);
      else pagerRef.current?.setPageWithoutAnimation(index);
    });
  };

  const isLoading = (seasonQuery.isLoading && myShows.length === 0) || scheduleQuery.isLoading;
  const hasError = !isLoading && entries.length === 0 && (seasonQuery.isError || scheduleQuery.isError);
  const refetch = () => {
    void seasonQuery.refetch();
    void scheduleQuery.refetch();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MenuButton />
          <Text style={styles.headerTitle}>Calendario</Text>
        </View>
        <Pressable hitSlop={12} onPress={() => goToTab(todayTab())}>
          <Text style={styles.todayText}>HOY</Text>
        </Pressable>
      </View>

      <StatusTabs tabs={tabs} active={tabs[activeIndex].key} onChange={goToTab} />

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={AppColors.accent} size="large" />
          <Text style={styles.emptyText}>Cargando el calendario…</Text>
        </View>
      ) : hasError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No se pudo cargar el calendario</Text>
          <Pressable style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        // key: al aparecer/desaparecer "Mis series" cambian los índices, así que se remonta.
        <PagerView
          key={tabs.length}
          ref={pagerRef}
          style={styles.pager}
          initialPage={activeIndex}
          offscreenPageLimit={1}
          onPageSelected={(e) => {
            const tab = tabs[e.nativeEvent.position];
            if (tab) setActiveTab(tab.key);
          }}>
          {tabs.map(({ key }, index) => (
            // collapsable={false} es obligatorio en Android (ver Home).
            <View key={key} style={styles.page} collapsable={false}>
              {Math.abs(index - activeIndex) <= 1 ? (
                <FlatList
                  data={entriesFor(key)}
                  keyExtractor={(entry) => String(entry.malId)}
                  renderItem={({ item }) => (
                    <CalendarCard
                      entry={item}
                      now={now}
                      onPress={() => router.push(`/anime/${item.malId}`)}
                    />
                  )}
                  extraData={now}
                  contentContainerStyle={styles.listContent}
                  refreshing={seasonQuery.isRefetching || scheduleQuery.isRefetching}
                  onRefresh={refetch}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>
                        {key === 'mine'
                          ? 'No tienes animes en emisión en tu lista esta semana.'
                          : 'No hay episodios programados.'}
                      </Text>
                    </View>
                  }
                />
              ) : null}
            </View>
          ))}
        </PagerView>
      )}
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
  todayText: { color: AppColors.text, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
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
  retryButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
