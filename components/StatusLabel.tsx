import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, radius, spacing, typographyExtras } from '../lib/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * Badge status (brief 08): radius.label, padding horizontal xs, vertikal xxs,
 * caption weight 600, memakai pasangan foreground/background semantik dari
 * token. Setiap status selalu punya label teks, jadi makna tidak bergantung
 * pada warna saja (brief 09).
 */

export type StatusTone = 'class' | 'info' | 'deadline' | 'overdue' | 'complete' | 'pending';

type Props = {
  tone: StatusTone;
  label: string;
};

export function StatusLabel({ tone, label }: Props) {
  const { colors } = useTheme();
  const palette = colors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexShrink: 0,
    borderRadius: radius.label,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  text: {
    // Brief 08: badge memakai caption weight 600 — lihat typographyExtras.
    ...typographyExtras.captionStrong,
    fontFamily,
  },
});
