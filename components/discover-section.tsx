import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

interface Props {
  title: string;
  isLoading?: boolean;
  isError?: boolean;
  /** Se muestra si la sección carga bien pero no trae nada. */
  emptyText?: string;
  isEmpty?: boolean;
  children: ReactNode;
}

/**
 * Bloque de Descubrir: título más carrusel horizontal. Cada sección gestiona su
 * propio estado, así que si una falla el resto de la pantalla sigue funcionando.
 */
export function DiscoverSection({ title, isLoading, isError, emptyText, isEmpty, children }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {isLoading ? (
        <View style={styles.placeholder}>
          <ActivityIndicator color={AppColors.accent} />
        </View>
      ) : isError ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No se pudo cargar esta sección.</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{emptyText ?? 'Nada por aquí todavía.'}</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}>
          {children}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    paddingVertical: 14,
  },
  title: {
    color: AppColors.text,
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 14 },
  placeholder: { paddingHorizontal: 14, paddingVertical: 16, alignItems: 'center' },
  placeholderText: { color: AppColors.textMuted, fontSize: 13, textAlign: 'center' },
});
