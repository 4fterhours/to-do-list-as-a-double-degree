/**
 * lib/tokens.ts
 *
 * SATU-SATUNYA sumber nilai visual aplikasi.
 *
 * Isi file ini mengikuti blok "Token TypeScript" pada Design Brief sumber
 * (dokumentasi lengkap: DESIGN_BRIEF.md). Nama, bentuk objek, dan nilai
 * sengaja dibuat identik agar mudah diaudit baris per baris.
 *
 * Aturan pakai:
 * - Komponen tidak boleh memakai hex, ukuran font, jarak, atau radius literal.
 * - Referensikan token lewat nama semantik: colors.class.background,
 *   typography.taskTitle, spacing.lg, geometry.icon.
 * - Pemilihan light/dark ada di theme/useTheme.ts, bukan di file ini.
 */

import { Platform, type TextStyle } from 'react-native';

export const spacing = { none: 0, xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 40, xxxl: 48 } as const;

export const radius = { small: 8, label: 6, card: 20, frame: 32, pill: 999 } as const;

export const typography = {
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  course: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  section: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  time: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  taskTitle: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 1.2 },
} as const;

/**
 * Stack web dipakai sebagai nilai `default` Platform.select (brief 04),
 * sekaligus fallback bila Platform.select mengembalikan undefined.
 * Platform.select bertipe `string | undefined`, karena itu tipenya ditegaskan.
 */
const webFontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const fontFamily: string =
  Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: webFontStack,
  }) ?? webFontStack;

export const colors = {
  light: {
    background: '#FAFAF7', surface: '#FFFFFF', surfaceSubtle: '#F1F2ED',
    text: { primary: '#242C29', secondary: '#657069', muted: '#697267' },
    border: '#DEE3DB', accent: '#35634F',
    class: { background: '#E9F0E8', text: '#294D3D', border: '#CEDDCE' },
    info: { background: '#EDF1F5', text: '#465F76' },
    deadline: { background: '#FFF1DD', text: '#8C5319' },
    overdue: { background: '#FBEAE6', text: '#AA3D31' },
    complete: { background: '#E9F0E8', text: '#35634F' },
    pending: { background: '#F1F2ED', text: '#657069' },
  },
  dark: {
    background: '#171D1A', surface: '#202823', surfaceSubtle: '#252E28',
    text: { primary: '#EDF1E9', secondary: '#B0BBAF', muted: '#A1AFA2' },
    border: '#354138', accent: '#A7C6AB',
    class: { background: '#293D30', text: '#D8E8D4', border: '#405743' },
    info: { background: '#28343F', text: '#B8CCDE' },
    deadline: { background: '#3D3020', text: '#EDC18A' },
    overdue: { background: '#412A26', text: '#F2ADA1' },
    complete: { background: '#293D30', text: '#A7C6AB' },
    pending: { background: '#252E28', text: '#B0BBAF' },
  },
} as const;

export type ThemeColors = typeof colors.light | typeof colors.dark;
export type ColorSchemeName = keyof typeof colors;

export const geometry = { frameWidth: 393, frameHeight: 852, borderWidth: 1, dividerWidth: 1, touchTarget: 48, icon: 20, iconSmall: 16, statusDot: 6, taskMarker: 20, heroMinimumHeight: 252, statusBarHeight: 44, statusSignal: 14, statusWifi: 15, statusBattery: 19, summaryIconContainer: 40, gestureWidth: 108, gestureHeight: 4 } as const;

export const elevation = { card: 0, row: 0 } as const;

/* ------------------------------------------------------------------------- */
/* Token tambahan (tidak ada di blok sumber — lihat DESIGN_BRIEF.md)         */
/* ------------------------------------------------------------------------- */

/**
 * Batas lebar untuk padding compact. Brief 09: "di bawah 360 dp padding 16".
 * Nilai 360 tidak tercantum di blok token sumber, tetapi dibutuhkan
 * implementasi responsif, jadi didefinisikan sekali di sini.
 */
export const breakpoint = { compactWidth: 360 } as const;

/**
 * Tabular figures untuk angka waktu. Brief 04 mewajibkan tabular-nums, namun
 * blok sumber tidak memuatnya sebagai token. Dipisah agar objek `typography`
 * tetap identik dengan sumber, dan tetap punya definisi yang jelas.
 */
export const tabularNumbers: Pick<TextStyle, 'fontVariant'> = { fontVariant: ['tabular-nums'] };

/**
 * Varian tipografi yang tidak ada di blok sumber, tetapi diwajibkan teks brief.
 *
 * `captionStrong` = brief 08 "caption weight 600" untuk badge. Blok sumber
 * hanya memuat `caption` berbobot 400. Ukuran dan line height diwarisi
 * langsung dari `typography.caption` sehingga tidak ada angka yang diduplikasi
 * dan nilainya tidak bisa melenceng dari sumber. Hanya weight yang ditimpa.
 *
 * Objek `typography` sendiri tidak diubah agar tetap identik dengan brief.
 */
export const typographyExtras = {
  captionStrong: {
    ...typography.caption,
    fontWeight: '600',
  },
} as const;
