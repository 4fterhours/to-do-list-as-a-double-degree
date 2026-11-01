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
import { join, sep } from 'node:path';

/**
 * Registry koneksi per direktori sementara.
 *
 * Kenapa perlu: di Windows, menghapus direktori yang masih memegang handle file
 * SQLite yang terbuka gagal dengan `EPERM`. Karena itu pembersihan direktori
 * HARUS menutup seluruh koneksi lebih dulu. Kalau urutan itu hanya dijamin oleh
 * `t.after()` milik test (yang bisa lupa, atau bisa berjalan setelah hook
 * pembersih), kegagalan justru bergantung pada platform.
 *
 * Di sini urutannya dijamin oleh satu fungsi: `cleanupTempDir()` menutup
 * semua koneksi yang tercatat untuk direktori itu, baru menghapus direktorinya.
 * Test tidak perlu memanggil `close()` sendiri; kalau memanggil pun tidak apa-apa
 * karena `close()` idempoten.
 */
const connectionsByDirectory = new Map();

/** Path langsung di dalam direktori (mencegah `dir` cocok dengan `dir-lain`). */
function isInside(path, directory) {
  return path === directory || path.startsWith(directory + sep);
}

/** Direktori sementara pemilik `path`, atau `undefined` bila bukan milik test. */
function ownerDirectoryOf(path) {
  for (const directory of connectionsByDirectory.keys()) {
    if (isInside(path, directory)) {
      return directory;
    }
  }
  return undefined;
}

/**
 * Menutup seluruh koneksi yang masih terbuka di `directory`, lalu — HANYA bila
 * tidak ada lagi koneksi terbuka — menghapus direktori beserta isinya. Aman
 * dipanggil berkali-kali: panggilan kedua tidak menemukan koneksi maupun
 * direktori apa pun.
 *
 * Kegagalan menutup satu koneksi tidak menghentikan penutupan koneksi lain.
 * Bila setelah seluruh percobaan masih ada koneksi dengan `raw.isOpen === true`,
 * direktori TIDAK dihapus dan registry TIDAK dibuang: koneksi itu masih
 * memegang berkas di dalam direktori, sehingga menghapusnya berisiko gagal
 * (EPERM di Windows) atau merusak berkas yang sedang dipakai.
 *
 * Keadaan itu sengaja dilaporkan dengan melempar error, bukan disembunyikan.
 * Direktori beserta koneksinya tetap terdaftar supaya percobaan pembersihan
 * berikutnya — termasuk jaring pengaman `process.once('exit')` — masih bisa
 * mencoba lagi setelah penyebabnya selesai (mis. statement SQLite selesai
 * dieksekusi).
 */
export function cleanupTempDir(directory) {
  const connections = connectionsByDirectory.get(directory) ?? new Set();

  for (const connection of [...connections]) {
    try {
      connection.close();
    } catch {
      // Koneksi menolak ditutup (mis. statement masih berjalan). Biarkan tetap
      // terdaftar; kegagalannya dilaporkan setelah seluruh percobaan selesai.
    }
  }

  const stillOpen = [...connections].filter((connection) => connection.raw?.isOpen === true);

  if (stillOpen.length > 0) {
    throw new Error(
      `Pembersihan direktori test dibatalkan: ${directory} masih dipakai oleh `
      + `${stillOpen.length} koneksi SQLite yang belum tertutup `
      + '(kemungkinan ada statement yang masih berjalan). '
      + 'Direktori dan koneksinya sengaja dipertahankan agar tidak menghapus '
      + 'berkas yang masih terbuka.',
    );
  }

  connections.clear();
  connectionsByDirectory.delete(directory);
  rmSync(directory, { recursive: true, force: true });
}

/**
 * Membuat direktori sementara. Direktori ini dihapus otomatis oleh `node:test`
 * setelah test selesai — termasuk ketika assertion gagal atau test melempar
 * exception — dan seluruh koneksi database di dalamnya ditutup lebih dulu.
 */
export function createTempDir(t) {
  const directory = mkdtempSync(join(tmpdir(), 'kelas-hari-ini-test-'));
  connectionsByDirectory.set(directory, new Set());

  t?.after?.(() => cleanupTempDir(directory));

  return directory;
}

/**
 * Jaring pengaman terakhir: bila ada direktori yang tidak sempat dibersihkan
 * oleh hook test (mis. `createTempDir()` dipanggil tanpa `t`), direktori itu
 * tetap ditutup dan dihapus saat proses test berakhir. Menjaga agar tidak ada
 * database test yang tertinggal.
 */
process.once('exit', () => {
  for (const directory of [...connectionsByDirectory.keys()]) {
    try {
      cleanupTempDir(directory);
    } catch (error) {
      // Proses sedang berakhir, jadi tidak ada lagi yang bisa dilakukan selain
      // menuliskan penyebabnya agar terlihat di keluaran test.
      console.error(`[kelas-hari-ini][test] ${error.message}`);
    }
  }
});

/**
 * Membuka database baru di `path` dan mengembalikan adaptor bergaya
 * `SQLiteDatabase`.
 *
 * Bila `path` berada di salah satu direktori sementara milik test, koneksi ini
 * didaftarkan ke direktori tersebut sehingga otomatis ditutup sebelum
 * direktorinya dihapus.
 *
 * `close()` tetap boleh dipanggil manual (dibutuhkan skenario persistensi:
 * tutup lalu buka ulang agar yang diuji benar-benar file, bukan cache), dan
 * aman dipanggil lebih dari sekali.
 */
export function openDatabase(path) {
  const raw = new DatabaseSync(path);
  raw.exec('PRAGMA foreign_keys = ON');

  let closed = false;

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

    /**
     * Menutup koneksi. Idempoten: penutupan manual lalu penutupan otomatis
     * tidak error.
     *
     * Adaptor baru dilepas dari registry setelah `raw.close()` benar-benar
     * berhasil. Bila `raw.close()` gagal sementara koneksinya masih terbuka,
     * adaptor TETAP terdaftar — kalau tidak, pembersihan direktori akan
     * mengira direktori itu sudah aman dihapus padahal berkasnya masih
     * dipegang koneksi yang hidup.
     */
    close() {
      if (closed) {
        return;
      }

      const directory = ownerDirectoryOf(path);

      // Koneksi sudah ditutup di luar adaptor (mis. test memanggil
      // `database.raw.close()` langsung): tidak ada yang perlu ditutup lagi,
      // cukup dilepas dari registry.
      if (raw.isOpen === false) {
        closed = true;
        connectionsByDirectory.get(directory)?.delete(adapter);
        return;
      }

      raw.close();
      closed = true;
      connectionsByDirectory.get(directory)?.delete(adapter);
    },
  };

  connectionsByDirectory.get(ownerDirectoryOf(path))?.add(adapter);

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
