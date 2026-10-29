import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily, geometry, spacing, typography } from '../lib/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * Header layar pengelolaan: tombol kembali (target sentuh 48 dp) + judul.
 * Dipakai di layar Jadwal dan Tugas agar tidak bergantung pada header bawaan
 * Stack, sehingga warna dan tipografi tetap dari token.
 */

type Props = {
  title: string;
  /** Teks kecil di bawah judul, mis. jumlah data. */
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Kembali"
        hitSlop={spacing.xs}
        style={({ pressed }) => [
          styles.backButton,
          { backgroundColor: pressed ? colors.surfaceSubtle : 'transparent' },
        ]}
      >
        <Ionicons name="chevron-back" size={geometry.icon} color={colors.text.primary} />
      </Pressable>

      <View style={styles.titleColumn}>
        <Text style={[styles.title, { color: colors.text.primary }]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  backButton: {
    width: geometry.touchTarget,
    height: geometry.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  titleColumn: {
    flex: 1,
    marginLeft: spacing.xxs,
  },
  title: {
    ...typography.section,
    fontFamily,
  },
  subtitle: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xxs,
  },
});
