import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddFriendModal } from '@/components/add-friend-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FriendActivityCard } from '@/components/friend-activity-card';
import { StatusTabs, type StatusTab } from '@/components/status-tabs';
import { AppColors } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { buildActivity, initialsOf } from '@/lib/friends-activity';
import { useFriends } from '@/lib/friends-context';
import { MAX_FRIENDS } from '@/lib/friends';
import { useFriendsData, useMyList } from '@/lib/queries';

type FriendsTab = 'activity' | 'friends';

export default function FriendsScreen() {
  const router = useRouter();
  const now = useNow();
  const { friends, hasFriend, add, remove } = useFriends();
  const { data, isLoading, refetch } = useFriendsData();
  const listQuery = useMyList('all');
  const [tab, setTab] = useState<FriendsTab>('activity');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const activity = useMemo(() => buildActivity(data), [data]);
  const myStatus = useMemo(
    () => new Map((listQuery.data ?? []).map((item) => [item.node.id, item.list_status])),
    [listQuery.data],
  );

  const tabs: StatusTab<FriendsTab>[] = [
    { key: 'activity', label: 'Actividad' },
    { key: 'friends', label: 'Amigos', count: friends.length },
  ];

  const addButton = (
    <Pressable
      onPress={() => setAdding(true)}
      hitSlop={12}
      disabled={friends.length >= MAX_FRIENDS}
      style={friends.length >= MAX_FRIENDS ? styles.disabled : undefined}>
      <Ionicons name="person-add" size={24} color={AppColors.text} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={AppColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Amigos</Text>
        {addButton}
      </View>

      {friends.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={56} color={AppColors.textMuted} />
          <Text style={styles.emptyTitle}>Aún no tienes amigos</Text>
          <Text style={styles.emptyText}>
            Agrega el usuario de MyAnimeList de un amigo para ver lo que está viendo y por qué
            episodio va. Funciona con listas públicas y tu amigo no necesita la app.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => setAdding(true)}>
            <Text style={styles.primaryText}>Agregar amigo</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <StatusTabs tabs={tabs} active={tab} onChange={setTab} />
          {tab === 'activity' ? (
            isLoading && activity.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={AppColors.accent} size="large" />
              </View>
            ) : (
              <FlatList
                data={activity}
                keyExtractor={(entry) => `${entry.friend}-${entry.item.node.id}`}
                renderItem={({ item }) => (
                  <FriendActivityCard
                    entry={item}
                    mine={myStatus.get(item.item.node.id)}
                    now={now}
                    onPress={() => router.push(`/anime/${item.item.node.id}`)}
                  />
                )}
                extraData={now}
                contentContainerStyle={styles.listContent}
                refreshing={isLoading}
                onRefresh={refetch}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      Sin actividad por ahora. Si sus listas son privadas, no se puede ver nada.
                    </Text>
                  </View>
                }
              />
            )
          ) : (
            <FlatList
              data={data}
              keyExtractor={(friend) => friend.username}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.friendRow, pressed && styles.pressed]}
                  onPress={() => router.push(`/friend/${encodeURIComponent(item.username)}` as Href)}
                  onLongPress={() => setRemoving(item.username)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initialsOf(item.username)}</Text>
                  </View>
                  <View style={styles.friendText}>
                    <Text style={styles.friendName}>{item.username}</Text>
                    <Text style={[styles.friendMeta, item.error && styles.friendError]}>
                      {item.isLoading
                        ? 'Cargando…'
                        : item.error
                          ? item.error.message
                          : `Viendo ${item.watching.length} ${item.watching.length === 1 ? 'serie' : 'series'}`}
                    </Text>
                  </View>
                  <Pressable onPress={() => setRemoving(item.username)} hitSlop={10}>
                    <Ionicons name="close" size={20} color={AppColors.textMuted} />
                  </Pressable>
                </Pressable>
              )}
              contentContainerStyle={styles.listContent}
              refreshing={isLoading}
              onRefresh={refetch}
            />
          )}
        </>
      )}

      <AddFriendModal
        visible={adding}
        hasFriend={hasFriend}
        onClose={() => setAdding(false)}
        onAdd={(username) => {
          add(username);
          setAdding(false);
        }}
      />

      <ConfirmDialog
        visible={removing !== null}
        title="Quitar amigo"
        message={removing ? `¿Quitar a ${removing} de tus amigos?` : undefined}
        confirmLabel="QUITAR"
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) remove(removing);
          setRemoving(null);
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
  headerTitle: { flex: 1, color: AppColors.text, fontSize: 24, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
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
  primaryButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 5,
    padding: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: AppColors.text, fontSize: 15, fontWeight: '800' },
  friendText: { flex: 1 },
  friendName: { color: AppColors.text, fontSize: 16, fontWeight: '700' },
  friendMeta: { color: AppColors.textMuted, fontSize: 13, marginTop: 2 },
  friendError: { color: AppColors.danger },
});
