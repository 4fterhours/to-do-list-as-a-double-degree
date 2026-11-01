/**
 * tests/support/db-fixtures.mjs
 *
 * Pembuat database untuk test. Semua memakai `db/*.ts` produksi
 * (`initializeDatabase`, `SCHEMA_V1_SQL`, `SCHEMA_V2_SQL`), jadi skema yang
 * diuji adalah skema asli, bukan salinan.
 */

import { join } from 'node:path';

import { initializeDatabase, getSchemaVersion } from '../../db/database.ts';
import { SCHEMA_V1_SQL, SCHEMA_VERSION } from '../../db/schema.ts';
import { createTempDir, openDatabase } from './sqlite.mjs';

/**
 * Database kosong yang sudah dimigrasikan ke versi skema aplikasi (v2) dan
 * berisi seed v1. Setara database baru di perangkat.
 */
export async function openInitializedDatabase(directory, fileName = 'hari-ini.db') {
  const database = openDatabase(join(directory, fileName));
  await initializeDatabase(database);
  return database;
}

/**
 * Database "pengguna versi v1": tabel v1 terisi data sendiri, `user_version = 1`,
 * tanpa pernah menjalankan migrasi v2. Dipakai untuk menguji migrasi pada data
 * yang sudah ada (bukan pada database kosong).
 */
export async function openV1DatabaseWithData(
  directory,
  { fileName = 'v1.db', schedules = [], tasks = [] } = {}
) {
  const database = openDatabase(join(directory, fileName));
  await database.execAsync(SCHEMA_V1_SQL);
  await database.execAsync('PRAGMA user_version = 1');

  for (const schedule of schedules) {
    await database.runAsync(
      `INSERT INTO schedules (course_name, day_of_week, start_time, end_time, room, reminder_minutes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      schedule.courseName,
      schedule.dayOfWeek,
      schedule.startTime,
      schedule.endTime,
      schedule.room ?? null,
      schedule.reminderMinutes ?? 15
    );
  }

  for (const task of tasks) {
    await database.runAsync(
      `INSERT INTO tasks (title, deadline_at, is_completed, schedule_id)
       VALUES (?, ?, ?, ?)`,
      task.title,
      task.deadlineAt,
      task.isCompleted ? 1 : 0,
      task.scheduleId ?? null
    );
  }

  return database;
}

// Diekspor ulang agar test cukup mengimpor satu modul fixture.
export { createTempDir, openDatabase, getSchemaVersion, SCHEMA_VERSION };

/**
 * Potret isi tabel `schedules` dan `tasks` beserta SEMUA kolom, untuk
 * membandingkan keadaan sebelum dan sesudah migrasi tanpa kehilangan detail.
 */
export async function snapshotContentTables(database) {
  const schedules = await database.getAllAsync(
    `SELECT id, course_name, day_of_week, start_time, end_time, room, reminder_minutes
       FROM schedules ORDER BY id ASC`
  );
  const tasks = await database.getAllAsync(
    `SELECT id, title, deadline_at, is_completed, schedule_id FROM tasks ORDER BY id ASC`
  );

  return { schedules, tasks };
}

/** Daftar nama tabel yang ada (tanpa tabel internal SQLite). */
export async function listTables(database) {
  const rows = await database.getAllAsync(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC`
  );
  return rows.map((row) => row.name);
}

/**
 * Mengosongkan tabel data pada database TEST (bukan database aplikasi), supaya
 * urutan dan jumlah baris dapat diuji tanpa terpengaruh data contoh.
 * Dijalankan pada database sementara hasil `openInitializedDatabase`.
 */
export async function clearContentTables(database) {
  await database.runAsync('DELETE FROM tasks');
  await database.runAsync('DELETE FROM schedules');
  await database.runAsync('DELETE FROM courses');
}
