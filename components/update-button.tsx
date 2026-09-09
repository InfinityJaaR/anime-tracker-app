import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';

import { AppColors } from '@/constants/theme';

interface Props {
  /** Hay cambios sin guardar: el botón aparece y late para invitar a pulsarlo. */
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/**
 * Botón UPDATE del detalle. Usa el Animated de React Native (no Reanimated) para
 * no depender del plugin de worklets, ya que el proyecto no tiene babel.config.js.
 */
export function UpdateButton({ active, disabled, onPress }: Props) {
  // 0 = oculto/inactivo, 1 = visible y disponible.
  const reveal = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: active ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [active, reveal]);

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation(() => pulse.setValue(0));
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 450,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 450,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const translateY = reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    // El hueco se reserva siempre para que el contenido no salte al aparecer.
    <Animated.View
      pointerEvents={active ? 'auto' : 'none'}
      style={[styles.wrapper, { opacity: reveal, transform: [{ translateY }, { scale }] }]}>
      <Pressable style={styles.button} onPress={onPress} disabled={disabled || !active}>
        <Text style={styles.text}>UPDATE</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginTop: 10 },
  button: {
    borderWidth: 1.5,
    borderColor: AppColors.accent,
    backgroundColor: AppColors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  text: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
