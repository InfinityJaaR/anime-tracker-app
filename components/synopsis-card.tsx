import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import { useSynopsisTranslation } from '@/lib/queries';

interface Props {
  animeId: number;
  synopsis: string;
}

/**
 * Tarjeta de sinopsis del detalle con traducción al español bajo demanda.
 * La traducción solo se pide la primera vez que se pulsa el botón; después
 * queda cacheada y alternar entre idiomas es instantáneo.
 */
export function SynopsisCard({ animeId, synopsis }: Props) {
  const [requested, setRequested] = useState(false);
  const [showSpanish, setShowSpanish] = useState(false);
  const translation = useSynopsisTranslation(animeId, synopsis, requested);

  const translated = translation.data;
  const loading = requested && translation.isFetching;
  const failed = requested && translation.isError && !translated;

  const onPress = () => {
    if (loading) return;
    if (failed) {
      void translation.refetch();
      setShowSpanish(true);
      return;
    }
    if (!requested) {
      setRequested(true);
      setShowSpanish(true);
      return;
    }
    setShowSpanish((value) => !value);
  };

  let label: string;
  if (loading) label = 'Traduciendo…';
  else if (!translated) label = failed ? 'Reintentar' : 'Traducir al español';
  else label = showSpanish ? 'Ver original' : 'Ver en español';

  const showingSpanish = showSpanish && !!translated;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Sinopsis</Text>
        <Pressable style={styles.translateButton} onPress={onPress} disabled={loading} hitSlop={8}>
          {loading ? (
            <ActivityIndicator size="small" color={AppColors.accent} />
          ) : (
            <Ionicons name="language-outline" size={16} color={AppColors.accent} />
          )}
          <Text style={styles.translateText}>{label}</Text>
        </Pressable>
      </View>

      <Text style={styles.synopsis}>{showingSpanish ? translated : synopsis}</Text>

      {failed ? (
        <Text style={styles.error}>No se pudo traducir. Toca «Reintentar» para volver a intentarlo.</Text>
      ) : null}

      {showingSpanish ? <Text style={styles.attribution}>Traducción automática (MyMemory)</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 14,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sectionTitle: { color: AppColors.text, fontSize: 18, fontWeight: '700' },
  translateButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  translateText: { color: AppColors.accent, fontSize: 13, fontWeight: '600' },
  synopsis: { color: AppColors.textMuted, fontSize: 14, lineHeight: 21 },
  error: { color: AppColors.danger, fontSize: 12, marginTop: 8 },
  attribution: { color: AppColors.textMuted, fontSize: 11, marginTop: 8, opacity: 0.7 },
});
