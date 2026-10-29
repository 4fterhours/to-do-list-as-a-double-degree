import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily, geometry, radius, spacing, typography } from '../lib/tokens';
import { useTheme } from '../theme/useTheme';
import { DangerButton, SecondaryButton } from './Buttons';

/**
 * Dialog konfirmasi penghapusan. Memakai `Modal` bawaan React Native agar
 * tidak menambah dependency, dengan warna dan radius dari token.
 */

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        {/* Ketuk latar menutup dialog. */}
        <Pressable style={styles.backdropFill} onPress={onCancel} accessibilityLabel="Tutup dialog" />

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text.primary }]} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>

          <View style={styles.actions}>
            <SecondaryButton label="Batal" onPress={onCancel} disabled={busy} />
            <DangerButton
              label={busy ? 'Menghapus…' : confirmLabel}
              onPress={onConfirm}
              accessibilityLabel={confirmLabel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    // Latar gelap transparan hanya untuk dialog, bukan dekorasi layar.
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdropFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  card: {
    width: '100%',
    borderRadius: radius.card,
    borderWidth: geometry.borderWidth,
    padding: spacing.lg,
  },
  title: {
    ...typography.section,
    fontFamily,
  },
  message: {
    ...typography.body,
    fontFamily,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
});
