/**
 * Paleta de la app: tema oscuro azul marino inspirado en la app de referencia.
 */
import { Platform } from 'react-native';

export const AppColors = {
  background: '#0B1826',
  surface: '#13243A',
  surfaceLight: '#1C3049',
  border: '#22364E',
  accent: '#2F80ED',
  text: '#ECEDEE',
  textMuted: '#8FA3B8',
  danger: '#E5484D',
  progressTrack: '#1E3550',
};

const tintColorLight = '#0a7ea4';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: AppColors.text,
    background: AppColors.background,
    tint: AppColors.accent,
    icon: AppColors.textMuted,
    tabIconDefault: AppColors.textMuted,
    tabIconSelected: AppColors.accent,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
