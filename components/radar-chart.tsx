/**
 * Gráfico de radar para visualizar la distribución de géneros.
 * Requiere react-native-svg (módulo nativo: hay que regenerar el APK).
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { AppColors } from '@/constants/theme';

export interface RadarPoint {
  name: string;
  /** Valor normalizado entre 0 y 1. */
  value: number;
}

interface Props {
  data: RadarPoint[];
  size?: number;
  /** Anillos de referencia dibujados entre el centro y el borde. */
  rings?: number;
}

/** Punto del eje `index` a distancia `radius` del centro, empezando arriba. */
function axisPoint(center: number, radius: number, index: number, total: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
}

export function RadarChart({ data, size = 260, rings = 4 }: Props) {
  if (data.length < 3) {
    return (
      <View style={[styles.placeholder, { height: size }]}>
        <Text style={styles.placeholderText}>
          Necesitas al menos 3 géneros distintos en tus animes vistos para dibujar el radar.
        </Text>
      </View>
    );
  }

  // Margen para que las etiquetas de género quepan dentro del SVG.
  const labelMargin = 46;
  const center = size / 2;
  const radius = center - labelMargin;
  const total = data.length;

  const polygonPoints = data
    .map((point, index) => {
      const { x, y } = axisPoint(center, radius * Math.max(0.04, point.value), index, total);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        {Array.from({ length: rings }, (_, ring) => (
          <Circle
            key={ring}
            cx={center}
            cy={center}
            r={(radius * (ring + 1)) / rings}
            stroke={AppColors.border}
            strokeWidth={1}
            fill="none"
          />
        ))}

        {data.map((point, index) => {
          const end = axisPoint(center, radius, index, total);
          return (
            <Line
              key={`axis-${point.name}`}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke={AppColors.border}
              strokeWidth={1}
            />
          );
        })}

        <Polygon
          points={polygonPoints}
          fill={AppColors.accent}
          fillOpacity={0.35}
          stroke={AppColors.accent}
          strokeWidth={2}
        />

        {data.map((point, index) => {
          const vertex = axisPoint(center, radius * Math.max(0.04, point.value), index, total);
          return (
            <Circle
              key={`vertex-${point.name}`}
              cx={vertex.x}
              cy={vertex.y}
              r={3}
              fill={AppColors.accent}
            />
          );
        })}

        {data.map((point, index) => {
          const label = axisPoint(center, radius + 16, index, total);
          // Alinear la etiqueta según en qué lado del círculo cae.
          const dx = label.x - center;
          const anchor = Math.abs(dx) < 8 ? 'middle' : dx > 0 ? 'start' : 'end';
          return (
            <SvgText
              key={`label-${point.name}`}
              x={label.x}
              y={label.y + 4}
              fill={AppColors.textMuted}
              fontSize={11}
              textAnchor={anchor}>
              {point.name}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  placeholder: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  placeholderText: {
    color: AppColors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
