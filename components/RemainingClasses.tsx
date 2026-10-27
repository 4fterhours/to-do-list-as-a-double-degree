import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, geometry, radius, spacing, typography } from '../lib/tokens';
import { clockToDisplay } from '../lib/time';
import { useTheme } from '../theme/useTheme';

/**
 * Ringkasan sisa kelas (brief 08): icon layers di dalam wadah surfaceSubtle,
 * bodyStrong dan caption, TANPA border luar. Wadah ikon bukan tombol.
 *
 * Brief 11: angka sisa kelas mencakup kelas yang sedang berlangsung dan yang
 * belum mulai. `lastEndTime` adalah jam selesai kelas terakhir yang tersisa.
 */

type Props = {
  count: number;
  lastEndTime: string | null;
};

export function RemainingClasses({ count, lastEndTime }: Props) {
  const { colors } = useTheme();

  const title = count === 0 ? 'Tidak ada kelas tersisa' : `${count} kelas tersisa`;
  const caption =
    count === 0
      ? 'Semua kelas hari ini sudah berakhir.'
      : lastEndTime
        ? `Kelas terakhir selesai ${clockToDisplay(lastEndTime)}`
        : 'Jadwal hari ini sudah lengkap.';

  const spoken = count === 0 ? title : `${title}. ${caption}`;

  return (
    <View style={styles.row} accessible accessibilityLabel={spoken}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceSubtle }]}>
        <Ionicons name="layers-outline" size={geometry.icon} color={colors.text.secondary} />
      </View>

      <View style={styles.textColumn}>
        <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
        <Text style={[styles.caption, { color: colors.text.secondary }]}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  iconContainer: {
    width: geometry.summaryIconContainer,
    height: geometry.summaryIconContainer,
    borderRadius: radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    ...typography.bodyStrong,
    fontFamily,
  },
  caption: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xxs,
  },
});
