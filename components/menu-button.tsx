import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { AppColors } from '@/constants/theme';
import { useSideMenu } from '@/lib/side-menu-context';

/** Hamburguesa de las cabeceras: abre el menú lateral. */
export function MenuButton() {
  const { open } = useSideMenu();
  return (
    <Pressable onPress={open} hitSlop={12} accessibilityLabel="Abrir menú">
      <Ionicons name="menu" size={28} color={AppColors.text} />
    </Pressable>
  );
}
