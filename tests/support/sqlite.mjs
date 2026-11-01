/**
 * tests/support/sqlite.mjs
 *
 * Adaptor tipis dari `node:sqlite` (bawaan Node) ke bentuk API `expo-sqlite`
 * yang benar-benar dipakai kode produksi: `execAsync`, `getAllAsync`,
 * `getFirstAsync`, `runAsync`, dan `withTransactionAsync`.
 *
 * Yang diuji tetap SQL dan logika di `db/*.ts` — adaptor ini hanya pengganti
 * mesin/koneksi, bukan salinan logika aplikasi.
 *
 * Semua database test berada di direktori sementara (`mkdtemp`), sehingga
 * database aplikasi (`hari-ini.db` di perangkat) tidak pernah tersentuh.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Membuat direktori sementara; dibersihkan otomatis oleh `node:test`. */
export function createTempDir(t) {
  const directory = mkdtempSync(join(tmpdir(), 'kelas-hari-ini-test-'));
  t?.after?.(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

/**
 * Membuka database baru di `path` dan mengembalikan adaptor bergaya
 * `SQLiteDatabase`. `close()` wajib dipanggil agar skenario persistensi
 * (tutup lalu buka ulang) benar-benar menguji file, bukan cache.
 */
export function openDatabase(path) {
  const raw = new DatabaseSync(path);
  raw.exec('PRAGMA foreign_keys = ON');

  const adapter = {
    /** Koneksi mentah, hanya untuk kebutuhan diagnosa test. */
    raw,

    async execAsync(sql) {
      raw.exec(sql);
    },

    async getAllAsync(sql, ...params) {
      return raw.prepare(sql).all(...params);
    },

    async getFirstAsync(sql, ...params) {
      const row = raw.prepare(sql).get(...params);
      return row ?? null;
    },

    async runAsync(sql, ...params) {
      const result = raw.prepare(sql).run(...params);
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },

    async withTransactionAsync(task) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },

    close() {
      raw.close();
    },
  };

  return adapter;
}

/**
 * Membungkus adaptor yang sudah ada sehingga satu metode melempar error.
 * Dipakai untuk menyuntikkan kegagalan baca database (D5) tanpa merusak
 * objek aslinya.
 */
export function withFailingMethod(database, method, message = `kegagalan database: ${method}`) {
  return new Proxy(database, {
    get(target, property, receiver) {
      if (property === method) {
        return async () => {
          throw new Error(message);
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

/**
 * Objek "database rusak": semua metode melempar. Meniru koneksi yang sudah
 * tidak dapat dipakai (mis. file hilang atau korup) tanpa memalsukan data.
 */
export function brokenDatabase(message = 'database tidak dapat dipakai') {
  const fail = async () => {
    throw new Error(message);
  };

  return {
    execAsync: fail,
    getAllAsync: fail,
    getFirstAsync: fail,
    runAsync: fail,
    withTransactionAsync: fail,
    close() {},
  };
}
