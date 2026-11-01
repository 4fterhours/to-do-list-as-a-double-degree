/**
 * tests/db/schedules.test.mjs
 *
 * Domain: CRUD JADWAL & MATA KULIAH.
 *
 * Kode yang diuji: db/schedules.ts, db/courses.ts (produksi, tanpa salinan).
 * Termasuk regresi D3: daftar jadwal harus tampil Senin → Minggu.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { listCourses } from '../../db/courses.ts';
import {
  DuplicateScheduleError,
  createSchedule,
  deleteSchedule,
  getAllSchedules,
  getScheduleById,
  getSchedulesForDay,
  updateSchedule,
} from '../../db/schedules.ts';
import {
  clearContentTables,
  createTempDir,
  openInitializedDatabase,
} from '../support/db-fixtures.mjs';

/** Jam selesai 100 menit setelah jam mulai; menjaga CHECK `end_time > start_time`. */
const endOf = (start) => {
  const [hour, minute] = start.split(':').map(Number);
  const total = hour * 60 + minute + 100;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const scheduleInput = (overrides = {}) => ({
  courseName: 'Hukum Dagang',
  dayOfWeek: 1,
  startTime: '10:00',
  endTime: '11:40',
  room: 'B-204',
  reminderMinutes: 15,
  ...overrides,
});

const withEmptyDatabase = async (t) => {
  const directory = createTempDir(t);
  const database = await openInitializedDatabase(directory);
  await clearContentTables(database);
  return database;
};

describe('JADWAL — CRUD', () => {
  test('membuat jadwal menyimpan seluruh kolom dan identitas mata kuliah', async (t) => {
    const database = await withEmptyDatabase(t);

    const id = await createSchedule(database, scheduleInput());
    const schedule = await getScheduleById(database, id);

    assert.ok(Number.isInteger(id) && id > 0);
    assert.equal(schedule.courseName, 'Hukum Dagang');
    assert.equal(schedule.dayOfWeek, 1);
    assert.equal(schedule.startTime, '10:00');
    assert.equal(schedule.endTime, '11:40');
    assert.equal(schedule.room, 'B-204');
    assert.equal(schedule.reminderMinutes, 15);
    assert.ok(Number.isInteger(schedule.courseId) && schedule.courseId > 0, 'course_id harus id sah');

    const courses = await listCourses(database);
    assert.deepEqual(courses.map((course) => course.name), ['Hukum Dagang']);

    database.close();
  });

  test('nama mata kuliah dibaca ulang melalui relasi courses', async (t) => {
    const database = await withEmptyDatabase(t);

    const id = await createSchedule(database, scheduleInput());
    const before = await getScheduleById(database, id);

    await database.runAsync('UPDATE courses SET name = ? WHERE id = ?', 'Hukum Dagang Niaga', before.courseId);

    const relasi = await database.getFirstAsync(
      `SELECT c.name FROM schedules s JOIN courses c ON c.id = s.course_id WHERE s.id = ?`,
      id
    );
    assert.equal(relasi.name, 'Hukum Dagang Niaga');

    database.close();
  });

  test('mengubah jadwal mengganti nilai lama', async (t) => {
    const database = await withEmptyDatabase(t);

    const id = await createSchedule(database, scheduleInput());
    await updateSchedule(database, id, scheduleInput({ startTime: '11:00', endTime: '12:40', room: null, reminderMinutes: 0 }));

    const schedule = await getScheduleById(database, id);
    assert.equal(schedule.startTime, '11:00');
    assert.equal(schedule.endTime, '12:40');
    assert.equal(schedule.room, null);
    assert.equal(schedule.reminderMinutes, 0);
    assert.equal((await getAllSchedules(database)).length, 1, 'tidak boleh membuat baris baru');

    database.close();
  });

  test('menghapus jadwal menghilangkan baris dan mata kuliah yang tidak terpakai', async (t) => {
    const database = await withEmptyDatabase(t);

    const id = await createSchedule(database, scheduleInput({ courseName: 'Statistika' }));
    await deleteSchedule(database, id);

    assert.equal(await getScheduleById(database, id), null);
    assert.deepEqual(await getAllSchedules(database), []);
    assert.deepEqual(await listCourses(database), [], 'mata kuliah yatim dibersihkan');

    database.close();
  });
});

describe('JADWAL — validasi duplikat', () => {
  test('mata kuliah + hari + jam mulai sama ditolak dengan pesan yang jelas', async (t) => {
    const database = await withEmptyDatabase(t);
    await createSchedule(database, scheduleInput());

    await assert.rejects(
      () => createSchedule(database, scheduleInput({ room: 'A-1' })),
      (error) => {
        assert.ok(error instanceof DuplicateScheduleError);
        assert.match(error.message, /sudah ada/i);
        assert.match(error.message, /Ubah jam mulai/i);
        return true;
      }
    );
    assert.equal((await getAllSchedules(database)).length, 1, 'baris tidak bertambah');

    database.close();
  });

  test('perbedaan kapitalisasi nama dianggap mata kuliah yang sama', async (t) => {
    const database = await withEmptyDatabase(t);
    await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang' }));

    await assert.rejects(
      () => createSchedule(database, scheduleInput({ courseName: 'hukum dagang' })),
      DuplicateScheduleError
    );

    database.close();
  });

  test('hari berbeda atau jam berbeda tetap diterima', async (t) => {
    const database = await withEmptyDatabase(t);

    await createSchedule(database, scheduleInput({ dayOfWeek: 1, startTime: '10:00' }));
    await createSchedule(database, scheduleInput({ dayOfWeek: 2, startTime: '10:00' }));
    await createSchedule(database, scheduleInput({ dayOfWeek: 1, startTime: '13:00', endTime: endOf('13:00') }));
    await createSchedule(
      database,
      scheduleInput({ courseName: 'Statistika', dayOfWeek: 1, startTime: '10:00' })
    );

    assert.equal((await getAllSchedules(database)).length, 4);

    database.close();
  });

  test('menyimpan ulang jadwal yang sama saat mengedit tidak dianggap duplikat dirinya sendiri', async (t) => {
    const database = await withEmptyDatabase(t);

    const id = await createSchedule(database, scheduleInput());
    await updateSchedule(database, id, scheduleInput({ room: 'B-999', reminderMinutes: 5 }));

    const schedule = await getScheduleById(database, id);
    assert.equal(schedule.room, 'B-999');
    assert.equal((await getAllSchedules(database)).length, 1);

    database.close();
  });

  test('mengubah jadwal menjadi bentrok dengan jadwal lain tetap ditolak', async (t) => {
    const database = await withEmptyDatabase(t);

    const first = await createSchedule(database, scheduleInput({ startTime: '10:00' }));
    await createSchedule(database, scheduleInput({ startTime: '13:00', endTime: endOf('13:00') }));

    await assert.rejects(
      () => updateSchedule(database, first, scheduleInput({ startTime: '13:00', endTime: endOf('13:00') })),
      DuplicateScheduleError
    );
    assert.equal((await getScheduleById(database, first)).startTime, '10:00', 'nilai lama tidak berubah');

    database.close();
  });
});

describe('JADWAL — urutan daftar (regresi D3)', () => {
  test('daftar jadwal tampil Senin, Selasa, …, Sabtu, Minggu', async (t) => {
    const database = await withEmptyDatabase(t);

    // Disisipkan acak agar urutan hasil bukan kebetulan urutan penyisipan.
    const rows = [
      { day: 3, start: '08:00', course: 'Rabu' },
      { day: 0, start: '09:00', course: 'Minggu' },
      { day: 5, start: '13:00', course: 'Jumat' },
      { day: 1, start: '10:00', course: 'Senin Siang' },
      { day: 6, start: '07:30', course: 'Sabtu' },
      { day: 2, start: '15:00', course: 'Selasa' },
      { day: 4, start: '11:00', course: 'Kamis' },
      { day: 1, start: '07:00', course: 'Senin Pagi' },
    ];
    for (const row of rows) {
      await createSchedule(
        database,
        scheduleInput({
          courseName: row.course,
          dayOfWeek: row.day,
          startTime: row.start,
          endTime: endOf(row.start),
        })
      );
    }

    const schedules = await getAllSchedules(database);

    assert.deepEqual(
      schedules.map((schedule) => schedule.courseName),
      ['Senin Pagi', 'Senin Siang', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
    );
    assert.deepEqual(
      schedules.map((schedule) => schedule.dayOfWeek),
      [1, 1, 2, 3, 4, 5, 6, 0],
      'Minggu (0) harus tampil terakhir'
    );
  });

  test('jadwal pada hari yang sama diurutkan menurut jam mulai', async (t) => {
    const database = await withEmptyDatabase(t);

    for (const start of ['15:00', '07:00', '13:00', '10:00']) {
      await createSchedule(database, scheduleInput({ startTime: start, endTime: endOf(start) }));
    }

    const schedules = await getAllSchedules(database);
    assert.deepEqual(
      schedules.map((schedule) => schedule.startTime),
      ['07:00', '10:00', '13:00', '15:00']
    );

    database.close();
  });

  test('urutan hari tidak mengubah nilai day_of_week yang tersimpan', async (t) => {
    const database = await withEmptyDatabase(t);

    await createSchedule(database, scheduleInput({ courseName: 'Minggu', dayOfWeek: 0 }));
    await createSchedule(database, scheduleInput({ courseName: 'Senin', dayOfWeek: 1 }));

    const rows = await database.getAllAsync('SELECT course_name, day_of_week FROM schedules ORDER BY id ASC');
    const stored = rows.map((row) => ({ course_name: row.course_name, day_of_week: row.day_of_week }));
    assert.deepEqual(stored, [
      { course_name: 'Minggu', day_of_week: 0 },
      { course_name: 'Senin', day_of_week: 1 },
    ]);

    const sunday = await getSchedulesForDay(database, 0);
    assert.equal(sunday.length, 1);
    assert.equal(sunday[0].courseName, 'Minggu');

    database.close();
  });
});
