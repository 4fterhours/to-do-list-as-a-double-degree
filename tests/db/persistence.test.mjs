/**
 * tests/db/persistence.test.mjs
 *
 * Domain: DATABASE — persistensi berkas, relasi mata kuliah ↔ jadwal ↔ tugas.
 *
 * Kode yang diuji: db/database.ts, db/courses.ts, db/schedules.ts, db/tasks.ts.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { initializeDatabase } from '../../db/database.ts';
import { listCourses } from '../../db/courses.ts';
import { createSchedule, getScheduleById, deleteSchedule } from '../../db/schedules.ts';
import { createTask, getTaskById, getAllTasks, updateTask } from '../../db/tasks.ts';
import { createTempDir, openDatabase, openInitializedDatabase } from '../support/db-fixtures.mjs';

const scheduleInput = (overrides = {}) => ({
  courseName: 'Metodologi Penelitian',
  dayOfWeek: 2,
  startTime: '09:00',
  endTime: '10:40',
  room: 'C-201',
  reminderMinutes: 20,
  ...overrides,
});

describe('DATABASE — persistensi & relasi', () => {
  test('data hasil CRUD tetap ada setelah koneksi ditutup dan dibuka kembali (AC-C6)', async (t) => {
    const directory = createTempDir(t);
    const path = join(directory, 'persist.db');

    const first = openDatabase(path);
    await initializeDatabase(first);

    const scheduleId = await createSchedule(first, scheduleInput());
    const courses = await listCourses(first);
    const courseId = courses.find((course) => course.name === 'Metodologi Penelitian').id;
    const taskId = await createTask(first, {
      title: 'Susun proposal',
      deadlineAt: Date.UTC(2026, 10, 10, 9, 0),
      courseId,
    });
    first.close();

    const second = openDatabase(path);
    await initializeDatabase(second);

    const schedule = await getScheduleById(second, scheduleId);
    const task = await getTaskById(second, taskId);

    assert.ok(schedule, 'jadwal harus masih ada');
    assert.equal(schedule.courseName, 'Metodologi Penelitian');
    assert.equal(schedule.startTime, '09:00');
    assert.equal(schedule.room, 'C-201');
    assert.equal(schedule.reminderMinutes, 20);

    assert.ok(task, 'tugas harus masih ada');
    assert.equal(task.title, 'Susun proposal');
    assert.equal(task.deadlineAt, Date.UTC(2026, 10, 10, 9, 0));
    assert.equal(task.isCompleted, false);
    assert.equal(task.courseId, courseId);
    assert.equal(task.courseName, 'Metodologi Penelitian');

    const schedules = await second.getAllAsync('SELECT COUNT(*) AS total FROM schedules');
    assert.equal(schedules[0].total, 5, '4 data contoh + 1 jadwal baru, tidak berganda');

    second.close();
  });

  test('satu mata kuliah dapat memiliki beberapa sesi jadwal dan satu identitas', async (t) => {
    const directory = createTempDir(t);
    const database = await openInitializedDatabase(directory);

    const senin = await createSchedule(database, scheduleInput({ courseName: 'Ekonomi Mikro', dayOfWeek: 1, startTime: '07:00' }));
    const rabu = await createSchedule(database, scheduleInput({ courseName: 'ekonomi mikro', dayOfWeek: 3, startTime: '07:00' }));

    const a = await getScheduleById(database, senin);
    const b = await getScheduleById(database, rabu);

    assert.equal(a.courseId, b.courseId, 'nama beda kapitalisasi = satu identitas');

    const rows = await database.getAllAsync('SELECT name FROM courses WHERE id = ?', a.courseId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name.toLowerCase(), 'ekonomi mikro');

    database.close();
  });

  test('nama mata kuliah tugas dibaca lewat relasi courses, bukan salinan', async (t) => {
    const directory = createTempDir(t);
    const database = await openInitializedDatabase(directory);

    const scheduleId = await createSchedule(database, scheduleInput({ courseName: 'Sosiologi Hukum' }));
    const schedule = await getScheduleById(database, scheduleId);

    const taskId = await createTask(database, {
      title: 'Baca bab 2',
      deadlineAt: Date.UTC(2026, 10, 12, 10, 0),
      courseId: schedule.courseId,
    });

    // Identitas diubah di tabel courses; tugas harus ikut menampilkan nama baru.
    await database.runAsync('UPDATE courses SET name = ? WHERE id = ?', 'Sosiologi Hukum II', schedule.courseId);

    const task = await getTaskById(database, taskId);
    assert.equal(task.courseName, 'Sosiologi Hukum II');

    database.close();
  });

  test('mengosongkan relasi mata kuliah membuat tugas menjadi tugas mandiri', async (t) => {
    const directory = createTempDir(t);
    const database = await openInitializedDatabase(directory);

    const scheduleId = await createSchedule(database, scheduleInput({ courseName: 'Filsafat Hukum' }));
    const schedule = await getScheduleById(database, scheduleId);

    const taskId = await createTask(database, {
      title: 'Esai bebas',
      deadlineAt: Date.UTC(2026, 10, 15, 8, 0),
      courseId: schedule.courseId,
    });

    await updateTask(database, taskId, {
      title: 'Esai bebas',
      deadlineAt: Date.UTC(2026, 10, 15, 8, 0),
      courseId: null,
    });

    const task = await getTaskById(database, taskId);
    assert.equal(task.courseId, null);
    assert.equal(task.courseName, null);

    database.close();
  });

  test('menghapus jadwal tidak menghapus tugas yang memakai mata kuliahnya', async (t) => {
    const directory = createTempDir(t);
    const database = await openInitializedDatabase(directory);

    const scheduleId = await createSchedule(database, scheduleInput({ courseName: 'Hukum Pidana' }));
    const schedule = await getScheduleById(database, scheduleId);
    const taskId = await createTask(database, {
      title: 'Analisis putusan',
      deadlineAt: Date.UTC(2026, 10, 20, 12, 0),
      courseId: schedule.courseId,
    });

    await deleteSchedule(database, scheduleId);

    const task = await getTaskById(database, taskId);
    assert.ok(task, 'tugas harus tetap ada');
    assert.equal(task.courseId, schedule.courseId, 'relasi mata kuliah tidak diputus oleh hapus jadwal');

    const courses = await listCourses(database);
    assert.ok(
      courses.some((course) => course.id === schedule.courseId),
      'mata kuliah masih dipakai tugas → tidak dibersihkan'
    );

    const remaining = await getAllTasks(database);
    assert.equal(remaining.filter((row) => row.id === taskId).length, 1);

    database.close();
  });
});
