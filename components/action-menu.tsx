import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { AppColors } from '@/constants/theme';

export interface MenuAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  title?: string;
  actions: MenuAction[];
  onClose: () => void;
}

/** Menú contextual estilo "Pick an Action" de la app original. */
export function ActionMenu({ visible, title = 'Pick an Action', actions, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              onPress={() => {
                onClose();
                action.onPress();
              }}>
              <Text style={[styles.actionText, action.destructive && styles.destructive]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  panel: {
    backgroundColor: AppColors.surface,
    borderRadius: 10,
    paddingVertical: 12,
  },
  title: {
    color: AppColors.text,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  action: { paddingHorizontal: 20, paddingVertical: 14 },
  actionPressed: { backgroundColor: AppColors.surfaceLight },
  actionText: { color: AppColors.text, fontSize: 16 },
  destructive: { color: AppColors.danger },
});
