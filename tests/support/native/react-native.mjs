/**
 * tests/support/native/react-native.mjs
 *
 * Tiruan `react-native` — SATU-SATUNYA bagian react-native yang dipakai kode
 * yang diuji: `Platform.OS`. Objek ini sengaja dapat diubah supaya test bisa
 * berpindah antara android / ios / web tanpa memuat ulang modul.
 *
 * Kalau kode produksi mulai memakai API react-native lain, test akan gagal
 * dengan jelas (bukan diam-diam lulus), karena propertinya tidak ada di sini.
 */

export const Platform = {
  OS: 'android',
  select(options) {
    return options[Platform.OS] ?? options.default;
  },
};

/** Mengubah platform aktif untuk test berikutnya. */
export function setPlatform(os) {
  if (!['android', 'ios', 'web'].includes(os)) {
    throw new Error(`platform uji tidak dikenal: ${os}`);
  }
  Platform.OS = os;
}
