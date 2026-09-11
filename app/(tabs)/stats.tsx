import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LevelInfoModal } from '@/components/level-info-modal';
import { LoginButton } from '@/components/login-button';
import { RadarChart } from '@/components/radar-chart';
import { AppColors } from '@/constants/theme';
import { WATCH_STATUS_LABELS, type MalWatchStatus } from '@/lib/api/mal';
import { useAuth } from '@/lib/auth/auth-context';
import { useFavorites } from '@/lib/favorites-context';
import { useMyList } from '@/lib/queries';
import { computeGenreStats, computeRank, computeSummary, formatWatchTime } from '@/lib/stats';

const STATUS_ORDER: MalWatchStatus[] = [
  'watching',
  'completed',
  'on_hold',
  'dropped',
  'plan_to_watch',
];

export default function StatsScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const allQuery = useMyList('all');
  const { favorites } = useFavorites();
  const [showLevels, setShowLevels] = useState(false);

  const items = useMemo(() => allQuery.data ?? [], [allQuery.data]);
  const summary = useMemo(() => computeSummary(items), [items]);
  const genres = useMemo(() => computeGenreStats(items), [items]);
  const rank = useMemo(
    () => computeRank(summary.byStatus.completed),
    [summary.byStatus.completed],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stats</Text>
        {isAuthenticated ? (
          <Pressable style={styles.infoButton} hitSlop={10} onPress={() => setShowLevels(true)}>
            <Ionicons name="information-circle-outline" size={18} color={AppColors.accent} />
            <Text style={styles.infoButtonText}>INFO</Text>
          </Pressable>
        ) : null}
      </View>

      {!isAuthenticated ? (
        <View style={styles.emptyState}>
          {authLoading ? (
            <ActivityIndicator color={AppColors.accent} size="large" />
          ) : (
            <>
              <Ionicons name="stats-chart-outline" size={56} color={AppColors.textMuted} />
              <Text style={styles.emptyTitle}>Tus estadísticas necesitan tu lista</Text>
              <Text style={styles.emptyText}>
                Inicia sesión con MyAnimeList para ver tu rango, tus géneros favoritos y el tiempo
                que llevas viendo anime.
              </Text>
              <LoginButton />
            </>
          )}
        </View>
      ) : allQuery.isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={AppColors.accent} size="large" />
          <Text style={styles.emptyText}>Calculando tus estadísticas…</Text>
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={allQuery.isRefetching}
              onRefresh={() => allQuery.refetch()}
              tintColor={AppColors.accent}
            />
          }>
          {/* Rango actual */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Tu rango</Text>
            <Text style={styles.rankName}>{rank.rank.name}</Text>
            <Text style={styles.rankMeta}>{rank.completed} animes completados</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(rank.progress * 100)}%` }]} />
            </View>
            <Text style={styles.rankMeta}>
              {rank.next
                ? `Faltan ${rank.remaining} para ${rank.next.name}`
                : 'Has llegado al último rango'}
            </Text>
          </View>

          {/* Radar de géneros */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Tus géneros</Text>
            {genres.length ? (
              <>
                <RadarChart data={genres} />
                <Text style={styles.radarCaption}>
                  Sobre {summary.byStatus.watching + summary.byStatus.completed} animes vistos o en
                  curso. Máximo: {genres[0].name} ({genres[0].count})
                </Text>
              </>
            ) : (
              <Text style={styles.emptyText}>
                Aún no hay géneros que analizar. Marca animes como Watching o Completed.
              </Text>
            )}
          </View>

          {/* Resumen */}
          <View style={styles.statsGrid}>
            <StatCard label="Animes" value={String(summary.totalAnime)} />
            <StatCard label="Episodios" value={String(summary.episodesWatched)} />
            <StatCard label="Tiempo visto" value={formatWatchTime(summary.minutesWatched)} />
            <StatCard
              label="Puntuación media"
              value={summary.scoredCount > 0 ? summary.meanScore.toFixed(2) : '—'}
              hint={summary.scoredCount > 0 ? `${summary.scoredCount} puntuados` : 'sin puntuar'}
            />
          </View>

          {/* Personajes favoritos */}
          <Pressable style={styles.card} onPress={() => router.push('/favorites')}>
            <View style={styles.favoritesHeader}>
              <Text style={styles.cardLabel}>Personajes favoritos</Text>
              <View style={styles.favoritesLink}>
                <Text style={styles.favoritesCount}>{favorites.length}</Text>
                <Ionicons name="chevron-forward" size={18} color={AppColors.textMuted} />
              </View>
            </View>
            {favorites.length ? (
              <View style={styles.facesRow}>
                {favorites.slice(0, 6).map((character) => (
                  <Image
                    key={character.id}
                    source={{ uri: character.imageUrl }}
                    style={styles.face}
                    contentFit="cover"
                    transition={150}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>
                Toca el corazón de un personaje en el detalle de cualquier anime para guardarlo.
              </Text>
            )}
          </Pressable>

          {/* Conteo por estado */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Por estado</Text>
            {STATUS_ORDER.map((status) => (
              <View key={status} style={styles.statusRow}>
                <Text style={styles.statusLabel}>{WATCH_STATUS_LABELS[status]}</Text>
                <Text style={styles.statusValue}>{summary.byStatus[status]}</Text>
              </View>
            ))}
            {summary.rewatching > 0 ? (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Rewatching</Text>
                <Text style={styles.statusValue}>{summary.rewatching}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      <LevelInfoModal
        visible={showLevels}
        onClose={() => setShowLevels(false)}
        currentRank={rank.rank.name}
      />
    </SafeAreaView>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
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
  infoButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoButtonText: { color: AppColors.accent, fontSize: 14, fontWeight: '700' },
  scrollContent: { paddingBottom: 32 },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
  },
  cardLabel: { color: AppColors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  rankName: { color: AppColors.text, fontSize: 26, fontWeight: '800' },
  rankMeta: { color: AppColors.textMuted, fontSize: 13, marginTop: 6 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.progressTrack,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: AppColors.accent, borderRadius: 4 },
  radarCaption: {
    color: AppColors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginHorizontal: 12,
    marginTop: 12,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
  },
  statValue: { color: AppColors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: AppColors.textMuted, fontSize: 13, marginTop: 4 },
  statHint: { color: AppColors.textMuted, fontSize: 11, marginTop: 2, opacity: 0.8 },
  favoritesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  favoritesLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  favoritesCount: { color: AppColors.text, fontSize: 16, fontWeight: '700' },
  facesRow: { flexDirection: 'row', gap: 8 },
  face: { width: 46, height: 60, borderRadius: 6, backgroundColor: AppColors.surfaceLight },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  statusLabel: { color: AppColors.textMuted, fontSize: 14 },
  statusValue: { color: AppColors.text, fontSize: 15, fontWeight: '600' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { color: AppColors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: AppColors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  loginButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  loginButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
