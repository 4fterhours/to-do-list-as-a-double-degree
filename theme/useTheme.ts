/**
 * theme/useTheme.ts
 *
 * Logika pemilihan tema (light/dark) memakai useColorScheme (brief 13).
 * Tidak menyimpan nilai visual apa pun — semua nilai berasal dari lib/tokens.ts.
 */

import { useColorScheme } from 'react-native';

import { colors, type ColorSchemeName, type ThemeColors } from '../lib/tokens';

export type AppTheme = {
  scheme: ColorSchemeName;
  /** True bila perangkat memakai skema gelap. */
  isDark: boolean;
  colors: ThemeColors;
};

/**
 * Nilai `null` (perangkat belum melaporkan skema) diperlakukan sebagai light
 * agar warna tidak berkedip saat aplikasi dibuka.
 */
export function useTheme(): AppTheme {
  const scheme: ColorSchemeName = useColorScheme() === 'dark' ? 'dark' : 'light';

  return {
    scheme,
    isDark: scheme === 'dark',
    colors: colors[scheme],
  };
}
