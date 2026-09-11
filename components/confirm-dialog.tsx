import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmación con el estilo de la app, en lugar del Alert nativo de Android. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'CANCELAR',
  destructive,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, destructive && styles.confirmDestructive]}
              onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
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
  panel: { backgroundColor: AppColors.surface, borderRadius: 12, padding: 20 },
  title: { color: AppColors.text, fontSize: 19, fontWeight: '700' },
  message: { color: AppColors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 20,
    marginTop: 24,
  },
  cancelButton: { paddingVertical: 8, paddingHorizontal: 8 },
  cancelText: { color: AppColors.textMuted, fontSize: 14, fontWeight: '700' },
  confirmButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  confirmDestructive: { backgroundColor: AppColors.danger },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
