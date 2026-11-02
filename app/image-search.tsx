import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImageMatchCard } from '@/components/image-match-card';
import { AppColors } from '@/constants/theme';
import { searchAnimeMal } from '@/lib/api/mal-public';
import {
  getQuota,
  LOW_CONFIDENCE,
  searchByImage,
  TraceMoeError,
  type ImageMatch,
} from '@/lib/api/trace-moe';

const TIPS = [
  'Recorta solo la escena: sin subtítulos, botones ni la interfaz de la app.',
  'Funciona con capturas de episodios; el fanart y las imágenes muy editadas fallan.',
  'Cuanto más nítida y completa sea la escena, mejor acierta.',
];

export default function ImageSearchScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);

  const quotaQuery = useQuery({ queryKey: ['trace-quota'], queryFn: getQuota, staleTime: 60_000, retry: 0 });
  const search = useMutation({
    mutationFn: ({ uri, mimeType }: { uri: string; mimeType?: string }) => searchByImage(uri, mimeType),
    onSettled: () => void quotaQuery.refetch(),
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // recorte integrado para quitar la interfaz del reel
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setImageUri(asset.uri);
    search.mutate({ uri: asset.uri, mimeType: asset.mimeType ?? undefined });
  };

  const openMatch = async (match: ImageMatch) => {
    // trace.moe no siempre trae el ID de MAL: se resuelve buscando por título.
    let malId = match.malId;
    if (malId === null) {
      try {
        malId = (await searchAnimeMal(match.title, 1)).data[0]?.mal_id ?? null;
      } catch {
        malId = null;
      }
    }
    if (malId !== null) router.push(`/anime/${malId}`);
  };

  const matches = search.data ?? [];
  const bestSimilarity = matches[0]?.similarity ?? 0;
  const quota = quotaQuery.data;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={AppColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Buscar por imagen</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} contentFit="contain" /> : null}

        <Pressable
          style={[styles.pickButton, search.isPending && styles.disabled]}
          onPress={() => void pickImage()}
          disabled={search.isPending}>
          <Ionicons name="image" size={22} color="#fff" />
          <Text style={styles.pickText}>{imageUri ? 'Elegir otra captura' : 'Elegir captura'}</Text>
        </Pressable>

        {quota ? (
          <Text style={styles.note}>
            Te quedan {quota.remaining} de {quota.quota} búsquedas este mes.
          </Text>
        ) : null}

        {search.isPending ? (
          <View style={styles.centered}>
            <ActivityIndicator color={AppColors.accent} size="large" />
            <Text style={styles.emptyText}>Buscando en miles de episodios…</Text>
          </View>
        ) : search.isError ? (
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>No se pudo buscar</Text>
            <Text style={styles.emptyText}>
              {search.error instanceof TraceMoeError ? search.error.message : 'Ocurrió un error inesperado.'}
            </Text>
            {imageUri ? (
              <Pressable
                style={styles.retryButton}
                onPress={() => search.mutate({ uri: imageUri })}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : search.isSuccess ? (
          matches.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>Sin coincidencias</Text>
              <Text style={styles.emptyText}>
                No encontré ese anime. Prueba recortando solo la escena, sin texto ni botones.
              </Text>
            </View>
          ) : (
            <View style={styles.results}>
              {bestSimilarity < LOW_CONFIDENCE ? (
                <View style={styles.warning}>
                  <Ionicons name="warning-outline" size={18} color={AppColors.scoreMid} />
                  <Text style={styles.warningText}>
                    Coincidencia baja: puede que ninguno sea el anime correcto.
                  </Text>
                </View>
              ) : null}
              {matches.map((match) => (
                <ImageMatchCard key={match.anilistId} match={match} onPress={() => void openMatch(match)} />
              ))}
            </View>
          )
        ) : (
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Cómo usarlo</Text>
            {TIPS.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={AppColors.accent} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.privacy}>
          La imagen se envía a trace.moe, un servicio externo, solo para buscarla.
        </Text>
      </ScrollView>
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
  headerTitle: { color: AppColors.text, fontSize: 24, fontWeight: '700' },
  content: { paddingBottom: 32 },
  preview: { height: 200, marginHorizontal: 12, marginBottom: 12, borderRadius: 12, backgroundColor: AppColors.surface },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: AppColors.accent,
    borderRadius: 12,
    marginHorizontal: 12,
    paddingVertical: 14,
  },
  disabled: { opacity: 0.5 },
  pickText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { color: AppColors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 10 },
  centered: { alignItems: 'center', gap: 12, padding: 32 },
  emptyTitle: { color: AppColors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: AppColors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  results: { marginTop: 14 },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(240,136,62,0.12)',
  },
  warningText: { flex: 1, color: AppColors.text, fontSize: 13, lineHeight: 18 },
  tips: { margin: 12, marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: AppColors.surface, gap: 10 },
  tipsTitle: { color: AppColors.text, fontSize: 16, fontWeight: '700' },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipText: { flex: 1, color: AppColors.textMuted, fontSize: 14, lineHeight: 19 },
  privacy: { color: AppColors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 18, paddingHorizontal: 24 },
});
