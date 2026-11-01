/**
 * tests/support/setup.mjs
 *
 * Dimuat lebih dulu di setiap proses test (`node --test --import ...`).
 *
 * Tugasnya:
 * 1. memastikan Node yang dipakai cukup baru (lihat `MINIMUM_NODE`) supaya
 *    kegagalan versi muncul sebagai satu pesan jelas, bukan test yang gagal
 *    dengan `SyntaxError` dari type-stripping;
 * 2. mendaftarkan hook resolusi (`resolve-hook.mjs`) agar import tanpa ekstensi
 *    di kode produksi dapat diselesaikan Node, dan agar `react-native` /
 *    `expo-notifications` diarahkan ke tiruan;
 * 3. menyediakan `globalThis.require` yang meniru `require` milik Metro untuk
 *    SATU modul native (`expo-notifications`), karena `lib/notifications.ts`
 *    memuatnya secara lazy dengan `require()`.
 *
 * Tidak ada state aplikasi yang disentuh di sini: test tetap mengatur sendiri
 * platform, izin, dan notifikasi yang dipakai.
 */

import { createRequire, register } from 'node:module';

/**
 * Node 22.18.0 adalah versi pertama yang menyalakan type-stripping `.ts` secara
 * default; Node 22.13.0 menghapus keharusan flag untuk `node:sqlite`. Di bawah
 * ini `npm test` tidak bisa dijalankan tanpa flag tambahan, jadi lebih baik
 * berhenti dengan pesan yang jelas.
 */
const MINIMUM_NODE = [22, 18, 0];

const current = process.versions.node.split('.').map((part) => Number.parseInt(part, 10));
const tooOld =
  current[0] < MINIMUM_NODE[0] ||
  (current[0] === MINIMUM_NODE[0] && current[1] < MINIMUM_NODE[1]) ||
  (current[0] === MINIMUM_NODE[0] && current[1] === MINIMUM_NODE[1] && current[2] < MINIMUM_NODE[2]);

if (tooOld) {
  throw new Error(
    `Test suite butuh Node >= ${MINIMUM_NODE.join('.')} (terpasang ${process.versions.node}). ` +
      'Type-stripping .ts dan node:sqlite tanpa flag baru tersedia sejak versi itu.',
  );
}

register('./resolve-hook.mjs', import.meta.url);

const native = await import('./native/expo-notifications.mjs');
const nodeRequire = createRequire(import.meta.url);

/**
 * `require` versi test. Hanya `expo-notifications` yang dilayani tiruan;
 * permintaan lain diteruskan ke `require` Node yang sebenarnya.
 */
globalThis.require = (specifier) => {
  if (specifier === 'expo-notifications') {
    if (!native.state.installed) {
      // Meniru build yang tidak memuat modul native (D6).
      throw new Error("Cannot find module 'expo-notifications'");
    }
    return native.mock;
  }

  return nodeRequire(specifier);
};
