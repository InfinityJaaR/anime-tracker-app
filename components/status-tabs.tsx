import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { ListFilter } from '@/lib/queries';

export interface StatusTab {
  key: ListFilter;
  label: string;
  count?: number;
}

interface Props {
  tabs: StatusTab[];
  active: ListFilter;
  onChange: (key: ListFilter) => void;
}

/** Tabs horizontales por estado de la lista (Watching, Plan to Watch, ...). */
export function StatusTabs({ tabs, active, onChange }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef<Record<string, { x: number; width: number }>>({});
  const [viewport, setViewport] = useState(0);

  // Al cambiar de pestaña con el gesto, la activa puede quedar fuera de vista.
  useEffect(() => {
    const tab = layouts.current[active];
    if (!tab || !viewport) return;
    scrollRef.current?.scrollTo({
      x: Math.max(0, tab.x + tab.width / 2 - viewport / 2),
      animated: true,
    });
  }, [active, viewport]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => setViewport(e.nativeEvent.layout.width)}
      contentContainerStyle={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const label = tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              layouts.current[tab.key] = { x, width };
            }}
            style={styles.tab}>
            <Text style={[styles.label, isActive && styles.labelActive]}>{label.toUpperCase()}</Text>
            <View style={[styles.indicator, isActive && styles.indicatorActive]} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 8 },
  tab: { paddingHorizontal: 12, paddingTop: 10 },
  label: { color: AppColors.textMuted, fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  labelActive: { color: AppColors.text },
  indicator: { height: 3, borderRadius: 2, marginTop: 8, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: '#fff' },
});
