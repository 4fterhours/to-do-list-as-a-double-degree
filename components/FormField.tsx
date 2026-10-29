import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, spacing, typography, typographyExtras } from '../lib/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * Label + isi + pesan kesalahan untuk satu field form.
 * Pesan kesalahan memakai pasangan `overdue` dan selalu berupa teks, sehingga
 * status tidak bergantung pada warna saja (brief 09).
 */

type Props = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, hint, error, children }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.secondary }]}>{label}</Text>
      {children}
      {error ? (
        <Text style={[styles.message, { color: colors.overdue.text }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.text.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  label: {
    ...typographyExtras.captionStrong,
    fontFamily,
    marginBottom: spacing.xxs,
  },
  message: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xxs,
  },
});
