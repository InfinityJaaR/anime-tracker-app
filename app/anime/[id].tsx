import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { AnimePosterCard } from '@/components/anime-poster-card';
import { CharacterCard } from '@/components/character-card';
import { ConfirmUpdateModal, type DraftChange } from '@/components/confirm-update-modal';
import { EpisodePickerModal } from '@/components/episode-picker-modal';
import { FullscreenImageModal } from '@/components/fullscreen-image-modal';
import { LoginButton } from '@/components/login-button';
import { ScorePickerModal, SCORE_LABELS } from '@/components/score-picker-modal';
import { StatusPickerModal, STATUS_CHOICE_LABELS, type StatusChoice } from '@/components/status-picker-modal';
import { UpdateButton } from '@/components/update-button';
import { AppColors } from '@/constants/theme';
import type { MalMyListStatus, UpdateListStatusParams } from '@/lib/api/mal';
import { useAuth } from '@/lib/auth/auth-context';
import { useFavorites } from '@/lib/favorites-context';
import {
  useAnimeCharacters,
  useAnimeFull,
  useMyListStatus,
  useRelatedAnime,
  useUpdateListStatus,
} from '@/lib/queries';

interface Draft {
  choice: StatusChoice;
  episodes: number;
  score: number;
}

function toDraft(status: MalMyListStatus): Draft {
  return {
    choice: status.is_rewatching ? 'rewatching' : status.status,
    episodes: status.num_episodes_watched,
    score: status.score,
  };
}

/** El draft se traduce a los campos que entiende MAL ("rewatching" no es un estado real). */
function draftToParams(draft: Draft): UpdateListStatusParams {
  return {
    status: draft.choice === 'rewatching' ? 'watching' : draft.choice,
    is_rewatching: draft.choice === 'rewatching',
    num_watched_episodes: draft.episodes,
    score: draft.score,
  };
}

export default function AnimeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const animeId = Number(id);

  const { isAuthenticated } = useAuth();
  const animeQuery = useAnimeFull(animeId);
  const charactersQuery = useAnimeCharacters(animeId);
  const relatedQuery = useRelatedAnime(animeId);
  const myStatusQuery = useMyListStatus(animeId);
  const updateMutation = useUpdateListStatus();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const [picker, setPicker] = useState<'status' | 'episodes' | 'score' | null>(null);
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const anime = animeQuery.data;
  const myStatus = myStatusQuery.data?.my_list_status;
  const totalEpisodes = anime?.episodes ?? myStatusQuery.data?.num_episodes ?? 0;

  // Los pickers solo tocan este borrador; nada viaja a MAL hasta pulsar UPDATE.
  const savedDraft = useMemo(() => (myStatus ? toDraft(myStatus) : null), [myStatus]);
  const [draft, setDraft] = useState<Draft | null>(savedDraft);

  // Resincronizar cuando MAL devuelve un estado nuevo (carga inicial, +1, refetch).
  useEffect(() => {
    setDraft(savedDraft);
  }, [savedDraft]);

  const isDirty =
    !!draft &&
    !!savedDraft &&
    (draft.choice !== savedDraft.choice ||
      draft.episodes !== savedDraft.episodes ||
      draft.score !== savedDraft.score);

  // Resumen que se muestra en la confirmación antes de escribir en MAL.
  const pendingChanges: DraftChange[] = useMemo(() => {
    if (!draft || !savedDraft) return [];
    const list: DraftChange[] = [];
    if (draft.choice !== savedDraft.choice) {
      list.push({
        label: 'Estado',
        from: STATUS_CHOICE_LABELS[savedDraft.choice],
        to: STATUS_CHOICE_LABELS[draft.choice],
      });
    }
    if (draft.episodes !== savedDraft.episodes) {
      const total = totalEpisodes > 0 ? totalEpisodes : '?';
      list.push({
        label: 'Episodios vistos',
        from: `${savedDraft.episodes}/${total}`,
        to: `${draft.episodes}/${total}`,
      });
    }
    if (draft.score !== savedDraft.score) {
      list.push({
        label: 'Puntuación',
        from: savedDraft.score > 0 ? `${savedDraft.score} ${SCORE_LABELS[savedDraft.score]}` : 'Sin puntuar',
        to: draft.score > 0 ? `${draft.score} ${SCORE_LABELS[draft.score]}` : 'Sin puntuar',
      });
    }
    return list;
  }, [draft, savedDraft, totalEpisodes]);

  const confirmDraft = () => {
    if (!draft || !isDirty) return;
    updateMutation.mutate(
      { animeId, params: draftToParams(draft) },
      { onSettled: () => setConfirming(false) },
    );
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
  const coverUri = anime.images.jpg.large_image_url ?? anime.images.jpg.image_url;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner + portada */}
        <View>
          <Pressable onPress={() => setFullscreenUri(bannerUri)}>
            <Image source={{ uri: bannerUri }} style={styles.banner} contentFit="cover" />
            <View style={styles.bannerOverlay} />
          </Pressable>
          <SafeAreaView style={styles.topBar} edges={['top']}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={26} color="#fff" />
            </Pressable>
          </SafeAreaView>
          <Pressable style={styles.cover} onPress={() => setFullscreenUri(coverUri)}>
            <Image source={{ uri: coverUri }} style={styles.coverImage} contentFit="cover" />
          </Pressable>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{anime.title}</Text>
          {anime.title_english && anime.title_english !== anime.title ? (
            <Text style={styles.subtitle}>{anime.title_english}</Text>
          ) : null}
        </View>

        {/* Estado en mi lista */}
        {isAuthenticated ? (
          draft ? (
            <>
              <View style={styles.statusRow}>
                <TrackingChip
                  caption="Estado"
                  value={STATUS_CHOICE_LABELS[draft.choice]}
                  changed={draft.choice !== savedDraft?.choice}
                  onPress={() => setPicker('status')}
                />
                <TrackingChip
                  caption="Progreso"
                  value={`${draft.episodes}/${totalEpisodes > 0 ? totalEpisodes : '?'}`}
                  changed={draft.episodes !== savedDraft?.episodes}
                  onPress={() => setPicker('episodes')}
                />
                <TrackingChip
                  caption="Nota"
                  value={
                    draft.score > 0 ? `${draft.score} ${SCORE_LABELS[draft.score]}` : 'Sin puntuar'
                  }
                  changed={draft.score !== savedDraft?.score}
                  onPress={() => setPicker('score')}
                />
              </View>
              <UpdateButton
                active={isDirty}
                disabled={updateMutation.isPending}
                onPress={() => setConfirming(true)}
              />
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
          <LoginButton
            variant="outline"
            label="Inicia sesión con MAL para trackear"
            style={styles.loginButton}
          />
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
                  <CharacterCard
                    key={entry.character.mal_id}
                    name={entry.character.name}
                    imageUrl={entry.character.images.jpg.image_url}
                    favorite={isFavorite(entry.character.mal_id)}
                    onToggleFavorite={() =>
                      toggleFavorite({
                        id: entry.character.mal_id,
                        name: entry.character.name,
                        imageUrl: entry.character.images.jpg.image_url,
                        animeId,
                        animeTitle: anime.title,
                      })
                    }
                    onPress={() => setFullscreenUri(entry.character.images.jpg.image_url)}
                  />
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Relacionados */}
        {relatedQuery.isLoading ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Relacionados</Text>
            <ActivityIndicator color={AppColors.accent} />
          </View>
        ) : relatedQuery.data && relatedQuery.data.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Relacionados</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.charactersRow}>
                {relatedQuery.data.map((item) => (
                  <AnimePosterCard
                    key={item.id}
                    title={item.title}
                    imageUrl={item.imageUrl}
                    badge={item.relationLabel}
                    onPress={() => router.push(`/anime/${item.id}`)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        ) : relatedQuery.isSuccess ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Relacionados</Text>
            <Text style={styles.synopsis}>Sin relacionados.</Text>
          </View>
        ) : null}
      </ScrollView>

      <StatusPickerModal
        visible={picker === 'status'}
        value={draft?.choice ?? 'watching'}
        onClose={() => setPicker(null)}
        onSelect={(choice) => setDraft((d) => (d ? { ...d, choice } : d))}
      />
      <EpisodePickerModal
        visible={picker === 'episodes'}
        value={draft?.episodes ?? 0}
        totalEpisodes={totalEpisodes}
        onClose={() => setPicker(null)}
        onSelect={(episodes) => setDraft((d) => (d ? { ...d, episodes } : d))}
      />
      <ScorePickerModal
        visible={picker === 'score'}
        value={draft?.score ?? 0}
        onClose={() => setPicker(null)}
        onSelect={(score) => setDraft((d) => (d ? { ...d, score } : d))}
      />

      <ConfirmUpdateModal
        visible={confirming}
        animeTitle={anime.title}
        changes={pendingChanges}
        pending={updateMutation.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={confirmDraft}
      />

      <FullscreenImageModal
        visible={fullscreenUri !== null}
        uri={fullscreenUri ?? undefined}
        title={anime.title}
        onClose={() => setFullscreenUri(null)}
      />
    </View>
  );
}

function TrackingChip({
  caption,
  value,
  changed,
  onPress,
}: {
  caption: string;
  value: string;
  changed: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.trackingChip,
        changed && styles.trackingChipChanged,
        pressed && styles.statusItemPressed,
      ]}
      onPress={onPress}>
      <View style={styles.trackingChipBody}>
        <Text style={styles.trackingCaption}>{caption}</Text>
        <Text
          style={[styles.trackingValue, changed && styles.statusItemTextChanged]}
          numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={AppColors.textMuted} />
    </Pressable>
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
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  titleBlock: { marginTop: 8, marginLeft: 120, marginRight: 16, minHeight: 48 },
  title: { color: AppColors.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: AppColors.textMuted, fontSize: 14, marginTop: 2 },
  statusRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 12,
    gap: 8,
  },
  trackingChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppColors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  trackingChipChanged: { borderColor: AppColors.accent },
  trackingChipBody: { flex: 1, gap: 2 },
  trackingCaption: {
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  trackingValue: { color: AppColors.text, fontSize: 14, fontWeight: '700' },
  statusItemPressed: { opacity: 0.85 },
  statusItemTextChanged: { color: AppColors.accent },
  primaryButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginButton: { marginHorizontal: 16, marginTop: 10 },
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
});
