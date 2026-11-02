import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimeListCard } from '@/components/anime-list-card';
import { FriendActivityCard } from '@/components/friend-activity-card';
import { StatusTabs, type StatusTab } from '@/components/status-tabs';
import { AppColors } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { buildActivity } from '@/lib/friends-activity';
import { useFriendsData, useMyList } from '@/lib/queries';

type FriendTab = 'watching' | 'recent';

export default function FriendScreen() {
  const router = useRouter();
  const now = useNow();
  const { name } = useLocalSearchParams<{ name: string }>();
  const username = decodeURIComponent(String(name ?? ''));
  const { data, refetch } = useFriendsData();
  const listQuery = useMyList('all');
  const [tab, setTab] = useState<FriendTab>('watching');

  const friend = data.find((f) => f.username.toLowerCase() === username.toLowerCase());
  const recent = useMemo(
    () => buildActivity(friend ? [{ username: friend.username, recent: friend.recent }] : [], 30),
    [friend],
  );
  const myStatus = useMemo(
    () => new Map((listQuery.data ?? []).map((item) => [item.node.id, item.list_status])),
    [listQuery.data],
  );

  const tabs: StatusTab<FriendTab>[] = [
    { key: 'watching', label: 'Viendo', count: friend?.watching.length },
    { key: 'recent', label: 'Reciente' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={AppColors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {friend?.username ?? username}
        </Text>
      </View>

      {!friend || friend.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={AppColors.accent} size="large" />
        </View>
      ) : friend.error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>{friend.error.message}</Text>
          <Pressable style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <StatusTabs tabs={tabs} active={tab} onChange={setTab} />
          {tab === 'watching' ? (
            <FlatList
              data={friend.watching}
              keyExtractor={(item) => String(item.node.id)}
              renderItem={({ item }) => (
                <AnimeListCard item={item} onPress={() => router.push(`/anime/${item.node.id}`)} />
              )}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Text style={styles.emptyText}>No está viendo nada ahora mismo.</Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={recent}
              keyExtractor={(entry) => String(entry.item.node.id)}
              renderItem={({ item }) => (
                <FriendActivityCard
                  entry={item}
                  mine={myStatus.get(item.item.node.id)}
                  now={now}
                  showFriend={false}
                  onPress={() => router.push(`/anime/${item.item.node.id}`)}
                />
              )}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Text style={styles.emptyText}>Sin actividad reciente.</Text>
                </View>
              }
            />
          )}
        </>
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
  headerTitle: { flex: 1, color: AppColors.text, fontSize: 24, fontWeight: '700' },
  listContent: { paddingBottom: 24, paddingTop: 4 },
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
