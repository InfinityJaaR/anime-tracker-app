import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import { FriendListError, validateFriend } from '@/lib/api/mal-friends';
import { isValidUsername } from '@/lib/friends';

interface Props {
  visible: boolean;
  /** Para avisar de duplicados antes de consultar a MAL. */
  hasFriend: (username: string) => boolean;
  onClose: () => void;
  /** Se llama con el usuario ya validado. */
  onAdd: (username: string) => void;
}

/** Pide el usuario de MAL de un amigo y comprueba que existe y que su lista es pública. */
export function AddFriendModal({ visible, hasFriend, onClose, onAdd }: Props) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (visible) {
      setUsername('');
      setError(null);
    }
  }, [visible]);

  const submit = async () => {
    const value = username.trim();
    if (!isValidUsername(value)) {
      setError('Escribe un usuario de MAL válido (2–16 letras, números, - o _).');
      return;
    }
    if (hasFriend(value)) {
      setError('Ya está en tu lista de amigos.');
      return;
    }
    setChecking(true);
    setError(null);
    try {
      await validateFriend(value);
      onAdd(value);
    } catch (e) {
      setError(e instanceof FriendListError ? e.message : 'No se pudo comprobar el usuario.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Agregar amigo</Text>
          <Text style={styles.hint}>
            Escribe su usuario de MyAnimeList. Solo funciona si su lista es pública.
          </Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setError(null);
            }}
            placeholder="Usuario de MAL"
            placeholderTextColor={AppColors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancel}>CANCELAR</Text>
            </Pressable>
            <Pressable
              style={[styles.confirm, checking && styles.disabled]}
              onPress={() => void submit()}
              disabled={checking}>
              {checking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmText}>AGREGAR</Text>
              )}
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
  panel: { backgroundColor: AppColors.surface, borderRadius: 12, padding: 20, gap: 12 },
  title: { color: AppColors.text, fontSize: 20, fontWeight: '700' },
  hint: { color: AppColors.textMuted, fontSize: 13, lineHeight: 18 },
  input: {
    color: AppColors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: AppColors.background,
  },
  error: { color: AppColors.danger, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 20, marginTop: 6 },
  cancel: { color: AppColors.textMuted, fontSize: 14, fontWeight: '700' },
  confirm: {
    backgroundColor: AppColors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
