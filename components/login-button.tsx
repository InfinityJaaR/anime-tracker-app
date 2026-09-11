import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth/auth-context';

interface Props {
  variant?: 'filled' | 'outline';
  label?: string;
  /** Márgenes propios de la pantalla que lo usa. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Abre el login de MAL directamente, sin pantalla intermedia.
 * signIn() ya lanza mensajes usables en UI (Expo Go, invalid_client, cancelado).
 */
export function LoginButton({ variant = 'filled', label = 'Iniciar sesión con MAL', style }: Props) {
  const { signIn } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outline = variant === 'outline';

  const handlePress = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={[styles.wrapper, style]}>
      <Pressable
        style={({ pressed }) => [
          outline ? styles.outline : styles.filled,
          pressed && styles.pressed,
          isBusy && styles.disabled,
        ]}
        onPress={handlePress}
        disabled={isBusy}>
        {isBusy ? (
          <ActivityIndicator color={outline ? AppColors.accent : '#fff'} />
        ) : (
          <Text style={outline ? styles.outlineText : styles.filledText}>{label}</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  filled: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  filledText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  outline: {
    borderWidth: 1.5,
    borderColor: AppColors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineText: { color: AppColors.accent, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
  error: { color: AppColors.danger, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
