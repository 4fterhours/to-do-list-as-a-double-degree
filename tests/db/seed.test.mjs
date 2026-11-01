/**
 * tests/db/seed.test.mjs
 *
 * Domain: DATABASE — seed ilustratif (PRD AC-E1).
 *
 * Kode yang diuji: db/seed.ts (lewat migrasi v1 di db/database.ts).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { initializeDatabase, migrate } from '../../db/database.ts';
import { seedInitialData } from '../../db/seed.ts';
import { createTempDir, openDatabase, openInitializedDatabase } from '../support/db-fixtures.mjs';

const countRows = async (database, table) => {
  const row = await database.getFirstAsync(`SELECT COUNT(*) AS total FROM ${table}`);
  return row.total;
};

describe('DATABASE — seed', () => {
  test('database baru berisi data contoh 4 jadwal dan 4 tugas', async (t) => {
    const directory = createTempDir(t);
    const database = await openInitializedDatabase(directory);

    assert.equal(await countRows(database, 'schedules'), 4);
    assert.equal(await countRows(database, 'tasks'), 4);

    database.close();
  });

  test('membuka aplikasi berkali-kali tidak menggandakan data contoh (AC-E1)', async (t) => {
    const directory = createTempDir(t);
    const path = join(directory, 'hari-ini.db');

    const first = openDatabase(path);
    await initializeDatabase(first);
    first.close();

    for (let open = 0; open < 3; open += 1) {
      const again = openDatabase(path);
      await initializeDatabase(again);
      assert.equal(await countRows(again, 'schedules'), 4, `buka ke-${open + 2}: jadwal tetap 4`);
      assert.equal(await countRows(again, 'tasks'), 4, `buka ke-${open + 2}: tugas tetap 4`);
      again.close();
    }
  });

  test('seed tidak pernah menimpa perubahan pengguna pada baris yang sama', async (t) => {
    const directory = createTempDir(t);
    const database = await openInitializedDatabase(directory);

    await database.runAsync(
      `UPDATE schedules SET course_name = 'Hukum Dagang (diubah)', room = 'C-301' WHERE id = 1`
    );
    await database.runAsync(`UPDATE tasks SET title = 'Judul pilihan saya' WHERE id = 1`);

    // Seed dipanggil ulang di dalam transaksi, meniru pemanggilan tak sengaja.
    await database.withTransactionAsync(() => seedInitialData(database));

    const schedule = await database.getFirstAsync('SELECT course_name, room FROM schedules WHERE id = 1');
    const task = await database.getFirstAsync('SELECT title FROM tasks WHERE id = 1');

    assert.equal(schedule.course_name, 'Hukum Dagang (diubah)');
    assert.equal(schedule.room, 'C-301');
    assert.equal(task.title, 'Judul pilihan saya');
    assert.equal(await countRows(database, 'schedules'), 4);
    assert.equal(await countRows(database, 'tasks'), 4);

    database.close();
  });

  test('seed hanya ditulis oleh migrasi v1: database v1 pengguna tidak diberi data contoh', async (t) => {
    const directory = createTempDir(t);
    const database = openDatabase(join(directory, 'pengguna-v1.db'));

    const { SCHEMA_V1_SQL } = await import('../../db/schema.ts');
    await database.execAsync(SCHEMA_V1_SQL);
    await database.execAsync('PRAGMA user_version = 1');
    await database.runAsync(
      `INSERT INTO schedules (course_name, day_of_week, start_time, end_time, room, reminder_minutes)
       VALUES ('Mata Kuliah Saya', 2, '09:00', '10:40', NULL, 15)`
    );

    await migrate(database);

    assert.equal(await countRows(database, 'schedules'), 1, 'data contoh tidak boleh muncul di database lama');
    assert.equal(await countRows(database, 'tasks'), 0);

    database.close();
  });
});
