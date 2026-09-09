import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  uri?: string;
  title: string;
  onClose: () => void;
}

/** Visor a pantalla completa con el título arriba; se cierra al tocar la imagen. */
export function FullscreenImageModal({ visible, uri, title, onClose }: Props) {
  return (
    <Modal visible={visible && !!uri} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <SafeAreaView style={styles.header} edges={['top']}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </SafeAreaView>
        <Pressable style={styles.imageArea} onPress={onClose}>
          {uri ? <Image source={{ uri }} style={styles.image} contentFit="contain" /> : null}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', flexShrink: 1 },
  imageArea: { flex: 1 },
  image: { flex: 1, width: '100%' },
});
