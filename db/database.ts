/**
 * db/database.ts
 *
 * Pembukaan & migrasi database. Nama file database dipakai oleh
 * `<SQLiteProvider databaseName>` di `src/app/_layout.tsx`, dan provider itulah
 * yang membuka file persisten di direktori dokumen aplikasi. Modul ini fokus
 * pada apa yang terjadi SETELAH koneksi terbuka: PRAGMA, migrasi, versi skema.
 *
 * Catatan penting:
 * - Hanya memakai `import type` dari expo-sqlite, sehingga logika migrasi bisa
 *   diuji dengan mesin SQLite lain (lihat laporan Tahap 2) tanpa React Native.
 * - `withTransactionAsync` dipakai, bukan `withExclusiveTransactionAsync`,
 *   karena versi terpasang (expo-sqlite 58.0.14) melempar
 *   "withExclusiveTransactionAsync is not supported on web". Pada saat
 *   inisialisasi belum ada query lain yang berjalan, jadi peringatan soal
 *   urutan eksekusi pada `withTransactionAsync` tidak berlaku di sini.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { SCHEMA_V1_SQL, SCHEMA_VERSION } from './schema';
import { seedInitialData } from './seed';

/** Nama file database persisten di direktori dokumen aplikasi. */
export const DATABASE_NAME = 'hari-ini.db';

type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

/**
 * Daftar migrasi, urut naik. Setiap entri dijalankan tepat satu kali per
 * database, di dalam transaksi, lalu `user_version` dinaikkan.
 *
 * Versi 1 membuat tabel DAN mengisi seed: seed hanya ikut pada pembuatan
 * database baru, tidak pernah pada pembukaan berikutnya.
 */
const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(SCHEMA_V1_SQL);
      await seedInitialData(db);
    },
  },
];

/**
 * `PRAGMA foreign_keys` bersifat per-koneksi dan TIDAK berpengaruh bila
 * dieksekusi di dalam transaksi, jadi harus dipanggil lebih dulu.
 */
export async function enableForeignKeys(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON');

  const row = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
  if (row?.foreign_keys !== 1) {
    throw new Error('PRAGMA foreign_keys gagal diaktifkan; foreign key tidak akan ditegakkan.');
  }
}

/** Membaca versi skema aktif. Database baru mengembalikan 0. */
export async function getSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Menjalankan migrasi yang belum diterapkan, masing-masing dalam satu
 * transaksi bersama kenaikan `user_version`-nya. Aman dipanggil setiap kali
 * aplikasi dibuka: bila versi sudah sama, tidak ada yang dieksekusi.
 */
export async function migrate(db: SQLiteDatabase): Promise<number> {
  await enableForeignKeys(db);

  const currentVersion = await getSchemaVersion(db);

  if (currentVersion > SCHEMA_VERSION) {
    throw new Error(
      `Versi database (${currentVersion}) lebih baru daripada versi aplikasi (${SCHEMA_VERSION}). ` +
        'Database tidak diturunkan otomatis untuk menghindari kehilangan data.'
    );
  }

  if (currentVersion === SCHEMA_VERSION) {
    return currentVersion;
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await db.withTransactionAsync(async () => {
      await migration.up(db);
      // PRAGMA tidak menerima parameter terikat; nilainya konstanta internal
      // dan sudah divalidasi sebagai bilangan bulat.
      await db.execAsync(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });
  }

  const finalVersion = await getSchemaVersion(db);
  if (finalVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Migrasi selesai tetapi versi skema ${finalVersion}, seharusnya ${SCHEMA_VERSION}.`
    );
  }

  return finalVersion;
}

/**
 * Handler `onInit` untuk `<SQLiteProvider>`: dijalankan provider sebelum
 * komponen anak dirender, sehingga migrasi tuntas sebelum ada pembacaan data.
 *
 * Referensi fungsi ini harus stabil (modul-level) karena `SQLiteProvider`
 * membandingkan `onInit` dengan referensi; fungsi inline akan memicu
 * pembukaan database berulang.
 *
 * Error sengaja dicatat lalu dilempar ulang — tidak ditelan — agar kegagalan
 * terlihat jelas dan ditangkap `DatabaseErrorBoundary`.
 */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  try {
    await migrate(db);
  } catch (error) {
    console.error('[db] Inisialisasi database gagal:', error);
    throw error;
  }
}
