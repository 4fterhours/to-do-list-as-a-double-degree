import { Ionicons } from '@expo/vector-icons';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { useReminderStatus, type ReminderStatus } from '../hooks/useReminderStatus';
import { fontFamily, geometry, radius, spacing, typography } from '../lib/tokens';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton, SecondaryButton } from './Buttons';

/**
 * Keterangan status pengingat kelas di layar Jadwal.
 *
 * Tujuannya hanya satu: memberi tahu apakah pengingat aktif, dan menyediakan
 * satu aksi jelas untuk mengaktifkannya. Tidak ada dekorasi tambahan; warna
 * hanya penanda dan setiap status tetap punya teks (brief 07/09).
 *
 * Izin TIDAK pernah diminta otomatis. Dialog izin baru muncul setelah pengguna
 * menekan "Aktifkan pengingat".
 */

type Presentation = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  caption: string;
  /** Tombol yang ditampilkan, bila ada. */
  action?: 'enable' | 'settings' | 'retry';
};

function present(status: ReminderStatus): Presentation {
  switch (status.kind) {
    case 'checking':
      return {
        icon: 'notifications-outline',
        title: 'Memeriksa pengingat…',
        caption: 'Menyesuaikan pengingat dengan jadwal terbaru.',
      };
    case 'active':
      return {
        icon: 'notifications-outline',
        title: 'Pengingat kelas aktif',
        caption:
          status.activeCount === 0
            ? 'Tambahkan jadwal untuk mulai menerima pengingat.'
            : `${status.activeCount} jadwal punya pengingat. Notifikasi muncul sebelum kelas dimulai.`,
      };
    case 'inactive':
      return {
        icon: 'notifications-off-outline',
        title: 'Pengingat belum aktif',
        caption:
          'Jadwal tetap tersimpan seperti biasa. Aktifkan izin notifikasi agar pengingat bisa muncul.',
        action: 'enable',
      };
    case 'blocked':
      return {
        icon: 'notifications-off-outline',
        title: 'Izin notifikasi diblokir',
        caption:
          'Pengingat tidak bisa diminta lagi dari aplikasi. Buka Pengaturan aplikasi lalu izinkan Notifikasi.',
        action: 'settings',
      };
    case 'unsupported':
      return {
        icon: 'notifications-off-outline',
        title: 'Pengingat hanya tersedia di Android dan iOS',
        caption: 'Di web, jadwal bisa dilihat dan diubah, tetapi notifikasi tidak dijadwalkan.',
      };
    case 'error':
      return {
        icon: 'alert-circle-outline',
        title: 'Pengingat belum dapat disiapkan',
        caption: status.message,
        action: 'retry',
      };
  }
}

export function ReminderStatusCard() {
  const { colors } = useTheme();
  const { status, busy, enable, refresh } = useReminderStatus();
  const presentation = present(status);

  const isWarning = status.kind === 'blocked' || status.kind === 'error';
  const iconColor = isWarning ? colors.overdue.text : colors.text.secondary;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.heading}>
        <Ionicons name={presentation.icon} size={geometry.icon} color={iconColor} />
        <Text style={[styles.title, { color: colors.text.primary }]}>{presentation.title}</Text>
      </View>

      <Text style={[styles.caption, { color: colors.text.secondary }]}>
        {presentation.caption}
      </Text>

      {presentation.action === 'enable' ? (
        <View style={styles.action}>
          <PrimaryButton
            label={busy ? 'Mengaktifkan…' : 'Aktifkan pengingat'}
            icon="notifications-outline"
            onPress={enable}
            disabled={busy}
          />
        </View>
      ) : null}

      {presentation.action === 'settings' ? (
        <View style={styles.action}>
          <SecondaryButton
            label="Buka Pengaturan"
            icon="settings-outline"
            onPress={() => {
              void Linking.openSettings();
            }}
          />
        </View>
      ) : null}

      {presentation.action === 'retry' ? (
        <View style={styles.action}>
          <SecondaryButton label="Coba lagi" icon="refresh-outline" onPress={refresh} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: geometry.borderWidth,
    borderRadius: radius.small,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyStrong,
    fontFamily,
    flexShrink: 1,
  },
  caption: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xxs,
  },
  action: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
});
