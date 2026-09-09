import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

interface Props {
  name: string;
  imageUrl?: string;
  favorite: boolean;
  onToggleFavorite: () => void;
  onPress?: () => void;
  width?: number;
}

/** Tarjeta de personaje con corazón de favorito superpuesto. */
export function CharacterCard({
  name,
  imageUrl,
  favorite,
  onToggleFavorite,
  onPress,
  width = 100,
}: Props) {
  const bounce = useRef(new Animated.Value(favorite ? 1 : 0)).current;
  // Evita animar en el primer render: solo rebota cuando el usuario lo cambia.
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      bounce.setValue(favorite ? 1 : 0);
      return;
    }
    Animated.sequence([
      Animated.timing(bounce, {
        toValue: favorite ? 1.35 : 0,
        duration: 130,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bounce, {
        toValue: favorite ? 1 : 0,
        duration: 130,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [favorite, bounce]);

  const scale = bounce.interpolate({ inputRange: [0, 1, 1.35], outputRange: [1, 1, 1.35] });

  return (
    <View style={{ width }}>
      <Pressable onPress={onPress} disabled={!onPress}>
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { width, height: width * 1.3 }]}
          contentFit="cover"
          transition={150}
        />
      </Pressable>
      <Pressable style={styles.heartButton} onPress={onToggleFavorite} hitSlop={8}>
        <Animated.View style={[styles.heartCircle, { transform: [{ scale }] }]}>
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={17}
            color={favorite ? AppColors.danger : '#fff'}
          />
        </Animated.View>
      </Pressable>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: 8, backgroundColor: AppColors.surfaceLight },
  heartButton: { position: 'absolute', top: 6, right: 6 },
  heartCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: AppColors.text, fontSize: 13, marginTop: 6, textAlign: 'center' },
});
