/**
 * tests/db/migration.test.mjs
 *
 * Domain: DATABASE — pembuatan, migrasi v1 → v2, keutuhan data, idempotensi.
 *
 * Kode yang diuji (produksi, tanpa salinan):
 *   db/database.ts  → initializeDatabase, migrate, getSchemaVersion, enableForeignKeys
 *   db/schema.ts    → SCHEMA_V1_SQL, SCHEMA_VERSION
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  enableForeignKeys,
  getSchemaVersion,
  initializeDatabase,
  migrate,
} from '../../db/database.ts';
import { SCHEMA_VERSION } from '../../db/schema.ts';
import {
  createTempDir,
  listTables,
  openDatabase,
  openV1DatabaseWithData,
  snapshotContentTables,
} from '../support/db-fixtures.mjs';

const V1_SCHEDULES = [
  { courseName: 'Hukum Dagang', dayOfWeek: 1, startTime: '10:00', endTime: '11:40', room: 'B-204', reminderMinutes: 15 },
  { courseName: 'Statistika', dayOfWeek: 3, startTime: '08:00', endTime: '09:40', room: null, reminderMinutes: 30 },
  { courseName: 'Hukum Dagang', dayOfWeek: 5, startTime: '13:00', endTime: '14:40', room: 'A-101', reminderMinutes: 0 },
];

const V1_TASKS = [
  { title: 'Ringkas bab 3', deadlineAt: Date.UTC(2026, 9, 30, 16, 59), isCompleted: false, scheduleId: 1 },
  { title: 'Latihan soal', deadlineAt: Date.UTC(2026, 10, 2, 15, 0), isCompleted: true, scheduleId: 2 },
  { title: 'Tugas mandiri', deadlineAt: Date.UTC(2026, 10, 5, 9, 0), isCompleted: false, scheduleId: null },
];

describe('DATABASE — pembuatan & migrasi', () => {
  test('database baru dibuat dari nol dan dimigrasikan ke versi skema aplikasi', async (t) => {
    const directory = createTempDir(t);
    const database = openDatabase(join(directory, 'baru.db'));

    assert.equal(await getSchemaVersion(database), 0, 'database baru harus user_version 0');

    await initializeDatabase(database);

    assert.equal(await getSchemaVersion(database), SCHEMA_VERSION);
    assert.equal(SCHEMA_VERSION, 2, 'skema aplikasi saat ini v2');
    assert.deepEqual(await listTables(database), ['courses', 'schedules', 'tasks']);

    database.close();
  });

  test('foreign key benar-benar aktif setelah enableForeignKeys', async (t) => {
    const directory = createTempDir(t);
    const database = openDatabase(join(directory, 'fk.db'));
    await initializeDatabase(database);

    await enableForeignKeys(database);
    const row = await database.getFirstAsync('PRAGMA foreign_keys');
    assert.equal(row.foreign_keys, 1);

    // Bukti penegakan: course_id yang tidak ada harus ditolak.
    await assert.rejects(
      () =>
        database.runAsync(
          `INSERT INTO schedules (course_name, course_id, day_of_week, start_time, end_time, room, reminder_minutes)
           VALUES ('X', 999, 1, '07:00', '08:00', NULL, 15)`
        ),
      /FOREIGN KEY constraint failed/i
    );

    database.close();
  });

  test('migrasi v1 → v2 tidak menghilangkan satu baris data pengguna pun', async (t) => {
    const directory = createTempDir(t);
    const database = await openV1DatabaseWithData(directory, {
      schedules: V1_SCHEDULES,
      tasks: V1_TASKS,
    });

    const before = await snapshotContentTables(database);
    assert.equal(before.schedules.length, 3);
    assert.equal(before.tasks.length, 3);

    await initializeDatabase(database);

    const after = await snapshotContentTables(database);
    assert.deepEqual(after.schedules, before.schedules, 'kolom jadwal harus identik sebelum vs sesudah');
    assert.deepEqual(after.tasks, before.tasks, 'kolom tugas harus identik sebelum vs sesudah');
    assert.equal(await getSchemaVersion(database), 2);

    database.close();
  });

  test('migrasi v2 mem-backfill course_id: satu identitas untuk nama yang sama', async (t) => {
    const directory = createTempDir(t);
    const database = await openV1DatabaseWithData(directory, {
      schedules: V1_SCHEDULES,
      tasks: V1_TASKS,
    });

    await initializeDatabase(database);

    const schedules = await database.getAllAsync(
      `SELECT s.id, s.course_name, s.course_id, c.name AS course_name_v2
         FROM schedules s LEFT JOIN courses c ON c.id = s.course_id
        ORDER BY s.id ASC`
    );

    assert.equal(schedules.length, 3);
    for (const schedule of schedules) {
      assert.ok(Number.isInteger(schedule.course_id) && schedule.course_id > 0, 'course_id harus id sah');
      assert.equal(schedule.course_name_v2, schedule.course_name, 'nama mata kuliah harus cocok dengan courses');
    }

    const hukum = schedules.filter((schedule) => schedule.course_name === 'Hukum Dagang');
    assert.equal(hukum.length, 2);
    assert.equal(new Set(hukum.map((s) => s.course_id)).size, 1, 'dua sesi mata kuliah sama → satu course_id');

    const courses = await database.getAllAsync('SELECT name FROM courses ORDER BY name COLLATE NOCASE ASC');
    assert.deepEqual(courses.map((row) => row.name), ['Hukum Dagang', 'Statistika']);

    database.close();
  });

  test('migrasi v2 mem-backfill course_id tugas dari jadwal lamanya', async (t) => {
    const directory = createTempDir(t);
    const database = await openV1DatabaseWithData(directory, {
      schedules: V1_SCHEDULES,
      tasks: V1_TASKS,
    });

    await initializeDatabase(database);

    const tasks = await database.getAllAsync(
      `SELECT t.id, t.schedule_id, t.course_id, c.name AS course_name
         FROM tasks t LEFT JOIN courses c ON c.id = t.course_id
        ORDER BY t.id ASC`
    );

    assert.equal(tasks[0].schedule_id, 1);
    assert.equal(tasks[0].course_name, 'Hukum Dagang');
    assert.equal(tasks[1].schedule_id, 2);
    assert.equal(tasks[1].course_name, 'Statistika');
    assert.equal(tasks[2].schedule_id, null);
    assert.equal(tasks[2].course_id, null, 'tugas tanpa jadwal tetap tanpa relasi');

    database.close();
  });

  test('migrasi berulang bersifat idempoten (tidak mengubah isi tabel)', async (t) => {
    const directory = createTempDir(t);
    const database = await openV1DatabaseWithData(directory, {
      schedules: V1_SCHEDULES,
      tasks: V1_TASKS,
    });

    await initializeDatabase(database);
    const afterFirst = await snapshotContentTables(database);
    const coursesAfterFirst = await database.getAllAsync('SELECT id, name FROM courses ORDER BY id ASC');

    for (let run = 0; run < 3; run += 1) {
      const version = await migrate(database);
      assert.equal(version, SCHEMA_VERSION);
    }

    assert.deepEqual(await snapshotContentTables(database), afterFirst);
    assert.deepEqual(
      await database.getAllAsync('SELECT id, name FROM courses ORDER BY id ASC'),
      coursesAfterFirst
    );

    database.close();
  });

  test('database yang versinya lebih baru ditolak, tidak diturunkan diam-diam', async (t) => {
    const directory = createTempDir(t);
    const database = openDatabase(join(directory, 'masa-depan.db'));
    await database.execAsync('PRAGMA user_version = 99');

    await assert.rejects(() => migrate(database), (error) => {
      assert.match(error.message, /lebih baru daripada versi aplikasi/i);
      return true;
    });
    assert.equal(await getSchemaVersion(database), 99, 'versi tidak boleh diubah saat penolakan');

    database.close();
  });

  test('migrasi yang gagal tidak menaikkan user_version (transaksi di-rollback)', async (t) => {
    const directory = createTempDir(t);
    const database = openDatabase(join(directory, 'gagal.db'));

    // Tabel `courses` sudah ada tetapi bentuknya salah → langkah v2 gagal.
    await database.execAsync(`
      CREATE TABLE courses (id INTEGER PRIMARY KEY, nama_lain TEXT);
      PRAGMA user_version = 1;
    `);

    await assert.rejects(() => migrate(database));
    assert.equal(await getSchemaVersion(database), 1, 'user_version harus tetap di versi terakhir yang utuh');

    database.close();
  });
});
