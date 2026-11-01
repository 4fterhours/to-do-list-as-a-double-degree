/**
 * tests/support/resolve-hook.mjs
 *
 * Hook resolusi modul untuk seluruh test suite.
 *
 * Ada dua masalah yang diselesaikan, keduanya tanpa mengubah kode produksi:
 *
 * 1. Kode produksi memakai import relatif tanpa ekstensi (`from './time'`,
 *    `from '../db/schedules'`). Metro/Expo menyelesaikannya, tetapi ESM Node
 *    mewajibkan spekifier lengkap. Hook ini mencoba `.ts` dan `/index.ts`
 *    sebelum menyerah, sehingga test mengimpor **file produksi asli**, bukan
 *    salinan.
 *
 * 2. Batas native (`react-native`, `expo-notifications`) diarahkan ke tiruan
 *    di `tests/support/native/`. Hanya modul batas ini yang dipalsukan; seluruh
 *    logika aplikasi (`db/*`, `lib/*`) tetap kode produksi.
 */

import { pathToFileURL } from 'node:url';

const NATIVE_REPLACEMENTS = new Map(
  Object.entries({
    'react-native': new URL('./native/react-native.mjs', import.meta.url).href,
    'expo-notifications': new URL('./native/expo-notifications.mjs', import.meta.url).href,
  })
);

/** Urutan ekstensi yang dicoba untuk import relatif tanpa ekstensi. */
const EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.mjs', '/index.ts'];

export async function resolve(specifier, context, nextResolve) {
  const replacement = NATIVE_REPLACEMENTS.get(specifier);
  if (replacement) {
    return { url: replacement, shortCircuit: true };
  }

  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const isRelative = specifier.startsWith('.') || specifier.startsWith('/');

    if (isRelative && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      for (const extension of EXTENSIONS) {
        try {
          return await nextResolve(specifier + extension, context);
        } catch {
          // coba ekstensi berikutnya
        }
      }
    }

    throw error;
  }
}

export { pathToFileURL };
