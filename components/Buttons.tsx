import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily, geometry, radius, spacing, typography } from '../lib/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * Tombol aksi. Semua tombol di aplikasi ini punya fungsi nyata (brief 12) dan
 * tinggi minimum `touchTarget` (48 dp) sesuai brief 09.
 */

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/** Tombol utama: latar accent, teks warna permukaan. */
export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.accent,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={geometry.iconSmall} color={colors.background} /> : null}
      <Text style={[styles.primaryLabel, { color: colors.background }]}>{label}</Text>
    </Pressable>
  );
}

/** Tombol sekunder: permukaan + border. */
export function SecondaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? colors.surfaceSubtle : colors.surface,
          borderColor: colors.border,
          borderWidth: geometry.borderWidth,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={geometry.iconSmall} color={colors.text.primary} /> : null}
      <Text style={[styles.secondaryLabel, { color: colors.text.primary }]}>{label}</Text>
    </Pressable>
  );
}

/** Tombol hapus: teks memakai pasangan `overdue`. */
export function DangerButton({
  label,
  onPress,
  icon,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? colors.overdue.background : 'transparent',
          borderColor: colors.overdue.background,
          borderWidth: geometry.borderWidth,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={geometry.iconSmall} color={colors.overdue.text} /> : null}
      <Text style={[styles.secondaryLabel, { color: colors.overdue.text }]}>{label}</Text>
    </Pressable>
  );
}

/** Baris berisi tombol-tombol dengan jarak seragam. */
export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: geometry.touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.small,
    gap: spacing.xxs,
  },
  primaryLabel: {
    ...typography.bodyStrong,
    fontFamily,
  },
  secondaryLabel: {
    ...typography.body,
    fontFamily,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
});
