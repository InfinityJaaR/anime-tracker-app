import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UpdateModal } from '@/components/update-modal';
import { AppColors } from '@/constants/theme';
import { WATCH_STATUS_LABELS } from '@/lib/api/mal';
import { useAuth } from '@/lib/auth/auth-context';
import {
  useAnimeCharacters,
  useAnimeFull,
  useMyListStatus,
  useUpdateListStatus,
} from '@/lib/queries';

export default function AnimeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const animeId = Number(id);

  const { isAuthenticated } = useAuth();
  const animeQuery = useAnimeFull(animeId);
  const charactersQuery = useAnimeCharacters(animeId);
  const myStatusQuery = useMyListStatus(animeId);
  const updateMutation = useUpdateListStatus();
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const anime = animeQuery.data;
  const myStatus = myStatusQuery.data?.my_list_status;
  const totalEpisodes = anime?.episodes ?? myStatusQuery.data?.num_episodes ?? 0;
  const watched = myStatus?.num_episodes_watched ?? 0;

  const plusOne = () => {
    const next = watched + 1;
    if (totalEpisodes > 0 && next > totalEpisodes) return;
    updateMutation.mutate({
      animeId,
      params: {
        num_watched_episodes: next,
        ...(totalEpisodes > 0 && next === totalEpisodes ? { status: 'completed' as const } : {}),
      },
    });
  };

  const addToList = () => {
    updateMutation.mutate({ animeId, params: { status: 'plan_to_watch' } });
  };

  if (animeQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={AppColors.accent} />
      </SafeAreaView>
    );
  }

  if (animeQuery.isError || !anime) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.sectionTitle}>No se pudo cargar el anime</Text>
        <Pressable style={styles.primaryButton} onPress={() => animeQuery.refetch()}>
          <Text style={styles.primaryButtonText}>Reintentar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const bannerUri =
    anime.trailer?.images?.maximum_image_url ??
    anime.trailer?.images?.large_image_url ??
    anime.images.jpg.large_image_url ??
    anime.images.jpg.image_url;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner + portada */}
        <View>
          <Image source={{ uri: bannerUri }} style={styles.banner} contentFit="cover" />
          <View style={styles.bannerOverlay} />
          <SafeAreaView style={styles.topBar} edges={['top']}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={26} color="#fff" />
            </Pressable>
          </SafeAreaView>
          <Image
            source={{ uri: anime.images.jpg.large_image_url ?? anime.images.jpg.image_url }}
            style={styles.cover}
            contentFit="cover"
          />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{anime.title}</Text>
          {anime.title_english && anime.title_english !== anime.title ? (
            <Text style={styles.subtitle}>{anime.title_english}</Text>
          ) : null}
        </View>

        {/* Estado en mi lista */}
        {isAuthenticated ? (
          myStatus ? (
            <>
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Ionicons name="calendar-outline" size={20} color={AppColors.text} />
                  <Text style={styles.statusItemText}>{WATCH_STATUS_LABELS[myStatus.status]}</Text>
                </View>
                <View style={styles.statusItem}>
                  <Ionicons name="eye-outline" size={20} color={AppColors.text} />
                  <Text style={styles.statusItemText}>
                    {watched}/{totalEpisodes > 0 ? totalEpisodes : '?'}
                  </Text>
                </View>
                <View style={styles.statusItem}>
                  <Ionicons name="thumbs-up-outline" size={20} color={AppColors.text} />
                  <Text style={styles.statusItemText}>{myStatus.score || '—'}</Text>
                </View>
              </View>
              <Pressable
                style={[styles.primaryButton, updateMutation.isPending && styles.disabled]}
                onPress={plusOne}
                disabled={updateMutation.isPending}>
                <Text style={styles.primaryButtonText}>+1</Text>
              </Pressable>
              <Pressable style={styles.outlineButton} onPress={() => setShowUpdateModal(true)}>
                <Text style={styles.outlineButtonText}>UPDATE</Text>
              </Pressable>
            </>
          ) : myStatusQuery.isLoading ? (
            <ActivityIndicator color={AppColors.accent} style={{ marginVertical: 16 }} />
          ) : (
            <Pressable
              style={[styles.primaryButton, updateMutation.isPending && styles.disabled]}
              onPress={addToList}
              disabled={updateMutation.isPending}>
              <Text style={styles.primaryButtonText}>Añadir a mi lista</Text>
            </Pressable>
          )
        ) : (
          <Pressable style={styles.outlineButton} onPress={() => router.push('/login')}>
            <Text style={styles.outlineButtonText}>Inicia sesión con MAL para trackear</Text>
          </Pressable>
        )}

        {/* Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Info</Text>
          <InfoRow label="Tipo" value={anime.type ?? '?'} />
          <InfoRow label="Episodios" value={anime.episodes ? String(anime.episodes) : '?'} />
          <InfoRow label="Estado" value={anime.status ?? '?'} />
          <InfoRow label="Emisión" value={anime.aired?.string ?? '?'} />
          {anime.season && anime.year ? (
            <InfoRow label="Temporada" value={`${anime.season} ${anime.year}`} />
          ) : null}
          {anime.studios?.length ? (
            <InfoRow label="Estudio" value={anime.studios.map((s) => s.name).join(', ')} />
          ) : null}
          {anime.score ? <InfoRow label="Score MAL" value={`★ ${anime.score}`} /> : null}
          <Pressable style={styles.malLink} onPress={() => Linking.openURL(anime.url)}>
            <Text style={styles.malLinkText}>Ver en MyAnimeList</Text>
            <Ionicons name="open-outline" size={16} color={AppColors.accent} />
          </Pressable>
        </View>

        {/* Géneros */}
        {anime.genres?.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Géneros</Text>
            <View style={styles.genresRow}>
              {[...(anime.genres ?? []), ...(anime.themes ?? [])].map((genre) => (
                <View key={`${genre.type}-${genre.mal_id}`} style={styles.genreChip}>
                  <Text style={styles.genreText}>{genre.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Sinopsis */}
        {anime.synopsis ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sinopsis</Text>
            <Text style={styles.synopsis}>{anime.synopsis}</Text>
          </View>
        ) : null}

        {/* Personajes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personajes</Text>
          {charactersQuery.isLoading ? (
            <ActivityIndicator color={AppColors.accent} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.charactersRow}>
                {(charactersQuery.data ?? []).slice(0, 15).map((entry) => (
                  <View key={entry.character.mal_id} style={styles.characterCard}>
                    <Image
                      source={{ uri: entry.character.images.jpg.image_url }}
                      style={styles.characterImage}
                      contentFit="cover"
                    />
                    <Text style={styles.characterName} numberOfLines={2}>
                      {entry.character.name}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      <UpdateModal
        visible={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        initialStatus={myStatus?.status ?? 'watching'}
        initialEpisodes={watched}
        initialScore={myStatus?.score ?? 0}
        totalEpisodes={totalEpisodes}
        onSave={(params) => updateMutation.mutate({ animeId, params })}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  scrollContent: { paddingBottom: 40 },
  banner: { width: '100%', height: 200 },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,24,38,0.45)',
  },
  topBar: { position: 'absolute', top: 0, left: 0, paddingHorizontal: 16, paddingTop: 8 },
  cover: {
    position: 'absolute',
    left: 16,
    bottom: -40,
    width: 90,
    height: 125,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: AppColors.background,
  },
  titleBlock: { marginTop: 8, marginLeft: 120, marginRight: 16, minHeight: 48 },
  title: { color: AppColors.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: AppColors.textMuted, fontSize: 14, marginTop: 2 },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginHorizontal: 16,
  },
  statusItem: { alignItems: 'center', gap: 4 },
  statusItemText: { color: AppColors.textMuted, fontSize: 13 },
  primaryButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: AppColors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
  },
  outlineButtonText: { color: AppColors.accent, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 14,
    padding: 16,
  },
  sectionTitle: { color: AppColors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 16 },
  infoLabel: { color: AppColors.textMuted, fontSize: 14 },
  infoValue: { color: AppColors.text, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  malLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  malLinkText: { color: AppColors.accent, fontSize: 14, fontWeight: '600' },
  genresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  genreText: { color: AppColors.text, fontSize: 13 },
  synopsis: { color: AppColors.textMuted, fontSize: 14, lineHeight: 21 },
  charactersRow: { flexDirection: 'row', gap: 12 },
  characterCard: { width: 100 },
  characterImage: { width: 100, height: 130, borderRadius: 8 },
  characterName: { color: AppColors.text, fontSize: 13, marginTop: 6, textAlign: 'center' },
});
