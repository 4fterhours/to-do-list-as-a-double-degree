import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { fontFamily, geometry, radius, spacing, typography } from '../lib/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * Input teks dengan gaya token: border 1, radius.small, tinggi minimum
 * touchTarget (48 dp) agar nyaman disentuh, dan warna teks dari tema.
 */

type Props = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'keyboardType'
  | 'maxLength'
  | 'autoCapitalize'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'autoFocus'
> & {
  invalid?: boolean;
  accessibilityLabel: string;
};

export function TextField({ invalid, accessibilityLabel, ...props }: Props) {
  const { colors } = useTheme();

  return (
    <TextInput
      {...props}
      accessibilityLabel={accessibilityLabel}
      placeholderTextColor={colors.text.muted}
      style={[
        styles.input,
        {
          backgroundColor: colors.surface,
          borderColor: invalid ? colors.overdue.text : colors.border,
          color: colors.text.primary,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    ...typography.body,
    fontFamily,
    minHeight: geometry.touchTarget,
    borderWidth: geometry.borderWidth,
    borderRadius: radius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
