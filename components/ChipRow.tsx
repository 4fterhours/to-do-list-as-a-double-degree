import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fontFamily, geometry, radius, spacing, typography } from '../lib/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * Deretan pilihan berbentuk chip (hari dalam minggu, mata kuliah).
 * Bisa digulir horizontal bila pilihannya banyak. Tinggi chip mengikuti
 * touchTarget agar tetap nyaman disentuh, dan pilihan aktif ditandai warna
 * `accent` + teks terang — bukan hanya warna latar (label tetap terbaca).
 */

export type ChipOption = {
  value: string;
  label: string;
};

type Props = {
  options: readonly ChipOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  /** Bila true, ketuk chip yang aktif membatalkan pilihan. */
  allowDeselect?: boolean;
  accessibilityLabel: string;
};

export function ChipRow({
  options,
  selected,
  onSelect,
  allowDeselect = false,
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(isSelected && allowDeselect ? null : option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.accent : colors.surface,
                borderColor: isSelected ? colors.accent : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                // Teks pada latar accent memakai warna permukaan agar kontras.
                { color: isSelected ? colors.background : colors.text.primary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
      <View style={styles.trailingSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    minHeight: geometry.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: geometry.borderWidth,
    marginRight: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontFamily,
  },
  trailingSpace: {
    width: spacing.xxs,
  },
});
