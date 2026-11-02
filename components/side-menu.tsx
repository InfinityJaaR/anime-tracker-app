import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth/auth-context';
import { useMyList } from '@/lib/queries';
import { pickRandomPlanToWatch } from '@/lib/random';
import { useSideMenu } from '@/lib/side-menu-context';

type IconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
  key: string;
  icon: IconName;
  title: string;
  subtitle?: string;
  /** String plano: los tipos de rutas se regeneran con `expo start`, no con tsc. */
  route?: string;
}

const PRIMARY_ITEMS: MenuItem[] = [
  { key: 'favorites', icon: 'heart', title: 'Favoritos', subtitle: 'Series y personajes', route: '/favorites' },
  { key: 'random', icon: 'shuffle', title: 'Anime aleatorio', subtitle: 'De tu Plan to Watch' },
  { key: 'recommendations', icon: 'thumbs-up', title: 'Recomendaciones', route: '/recommendations' },
];

const SECONDARY_ITEMS: MenuItem[] = [
  { key: 'advanced-search', icon: 'pricetags', title: 'Búsqueda avanzada', route: '/advanced-search' },
  { key: 'seasonal', icon: 'calendar', title: 'Temporadas de anime', route: '/seasonal' },
];

const SETTINGS_ITEM: MenuItem = {
  key: 'settings',
  icon: 'settings',
  title: 'Configuración',
  route: '/settings',
};

/** Menú lateral que se desliza desde la izquierda; Configuración queda fija abajo. */
export function SideMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isOpen, close } = useSideMenu();
  const { isAuthenticated, user } = useAuth();
  const listQuery = useMyList('all');

  const panelWidth = Math.min(width * 0.82, 340);
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // El Modal sigue montado mientras dura la animación de salida.
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setMounted(false);
        },
      );
    }
  }, [isOpen, progress]);

  const pickRandom = () => {
    if (!isAuthenticated) {
      setNotice('Inicia sesión con MyAnimeList para elegir un anime de tu lista.');
      return;
    }
    if (!listQuery.data) {
      setNotice('Tu lista aún se está cargando. Inténtalo en un momento.');
      return;
    }
    const pick = pickRandomPlanToWatch(listQuery.data);
    if (!pick) {
      setNotice('No tienes animes en Plan to Watch.');
      return;
    }
    router.push(`/anime/${pick.node.id}`);
  };

  const onItemPress = (item: MenuItem) => {
    close();
    // El menú aún se está cerrando: esperar un frame evita fallos de Modal en Android.
    requestAnimationFrame(() => {
      if (item.key === 'random') pickRandom();
      else if (item.route) router.push(item.route as Href);
    });
  };

  const renderItem = (item: MenuItem) => (
    <Pressable
      key={item.key}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={() => onItemPress(item)}>
      <Ionicons name={item.icon} size={24} color={AppColors.text} style={styles.itemIcon} />
      <View style={styles.itemText}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.subtitle ? <Text style={styles.itemSubtitle}>{item.subtitle}</Text> : null}
      </View>
    </Pressable>
  );

  return (
    <>
      <Modal visible={mounted} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
        <View style={styles.root}>
          <Animated.View
            style={[styles.backdrop, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }) }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          </Animated.View>

          <Animated.View
            style={[
              styles.panel,
              {
                width: panelWidth,
                paddingTop: insets.top,
                transform: [
                  { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }) },
                ],
              },
            ]}>
            <View style={styles.header}>
              <View style={styles.logo}>
                <Ionicons name="play" size={26} color="#fff" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.appName}>Anime Tracker</Text>
                <Text style={styles.userName} numberOfLines={1}>
                  {user ? user.name : 'Sin sesión'}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {PRIMARY_ITEMS.map(renderItem)}
              <View style={styles.divider} />
              {SECONDARY_ITEMS.map(renderItem)}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 4 }]}>
              {renderItem(SETTINGS_ITEM)}
            </View>
          </Animated.View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={notice !== null}
        title="Anime aleatorio"
        message={notice ?? undefined}
        confirmLabel="ENTENDIDO"
        cancelLabel="CERRAR"
        onCancel={() => setNotice(null)}
        onConfirm={() => setNotice(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: AppColors.background,
    borderRightWidth: 1,
    borderRightColor: AppColors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  appName: { color: AppColors.text, fontSize: 18, fontWeight: '700' },
  userName: { color: AppColors.textMuted, fontSize: 14, marginTop: 2 },
  scroll: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  itemPressed: { backgroundColor: AppColors.surface },
  itemIcon: { width: 32 },
  itemText: { flex: 1, marginLeft: 12 },
  itemTitle: { color: AppColors.text, fontSize: 16, fontWeight: '600' },
  itemSubtitle: { color: AppColors.textMuted, fontSize: 13, marginTop: 1 },
  divider: { height: 1, backgroundColor: AppColors.border, marginVertical: 8 },
  footer: { borderTopWidth: 1, borderTopColor: AppColors.border, paddingTop: 4 },
});
