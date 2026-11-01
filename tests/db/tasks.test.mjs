/**
 * tests/db/tasks.test.mjs
 *
 * Domain: CRUD TUGAS.
 *
 * Kode yang diuji: db/tasks.ts (produksi). Meliputi relasi mata kuliah,
 * status selesai, urutan deadline, dan penyaringan tugas pending (PRD FR-C4).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { listCourses } from '../../db/courses.ts';
import { createSchedule, getScheduleById } from '../../db/schedules.ts';
import {
  createTask,
  deleteTask,
  getAllTasks,
  getPendingTasks,
  getTaskById,
  setTaskCompleted,
  updateTask,
} from '../../db/tasks.ts';
import {
  clearContentTables,
  createTempDir,
  openInitializedDatabase,
} from '../support/db-fixtures.mjs';

const DEADLINE = {
  dekat: Date.UTC(2026, 10, 2, 9, 0),
  sedang: Date.UTC(2026, 10, 5, 9, 0),
  jauh: Date.UTC(2026, 10, 20, 9, 0),
};

const withEmptyDatabase = async (t) => {
  const directory = createTempDir(t);
  const database = await openInitializedDatabase(directory);
  await clearContentTables(database);
  return database;
};

describe('TUGAS — CRUD', () => {
  test('membuat tugas menyimpan judul, deadline, dan status belum selesai', async (t) => {
    const database = await withEmptyDatabase(t);

    const id = await createTask(database, {
      title: '  Ringkas bab 3  ',
      deadlineAt: DEADLINE.dekat,
      courseId: null,
    });
    const task = await getTaskById(database, id);

    assert.equal(task.title, 'Ringkas bab 3', 'judul dirapikan');
    assert.equal(task.deadlineAt, DEADLINE.dekat);
    assert.equal(task.isCompleted, false);
    assert.equal(task.courseId, null);
    assert.equal(task.courseName, null);
    assert.equal(task.scheduleId, null, 'kolom warisan schedule_id tidak diisi UI');

    database.close();
  });

  test('mengubah tugas mengganti judul, deadline, dan relasi', async (t) => {
    const database = await withEmptyDatabase(t);

    const id = await createTask(database, { title: 'Awal', deadlineAt: DEADLINE.dekat, courseId: null });
    await updateTask(database, id, { title: 'Akhir', deadlineAt: DEADLINE.jauh, courseId: null });

    const task = await getTaskById(database, id);
    assert.equal(task.title, 'Akhir');
    assert.equal(task.deadlineAt, DEADLINE.jauh);
    assert.equal((await getAllTasks(database)).length, 1);

    database.close();
  });

  test('menghapus tugas menghilangkan barisnya', async (t) => {
    const database = await withEmptyDatabase(t);

    const id = await createTask(database, { title: 'Hapus saya', deadlineAt: DEADLINE.dekat, courseId: null });
    await deleteTask(database, id);

    assert.equal(await getTaskById(database, id), null);
    assert.deepEqual(await getAllTasks(database), []);

    database.close();
  });

  test('menghubungkan tugas dengan mata kuliah menampilkan nama dari relasi', async (t) => {
    const database = await withEmptyDatabase(t);

    const scheduleId = await createSchedule(database, {
      courseName: 'Hukum Dagang',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:40',
      room: null,
      reminderMinutes: 15,
    });
    const schedule = await getScheduleById(database, scheduleId);

    const taskId = await createTask(database, {
      title: 'Analisis kontrak',
      deadlineAt: DEADLINE.sedang,
      courseId: schedule.courseId,
    });

    const task = await getTaskById(database, taskId);
    assert.equal(task.courseId, schedule.courseId);
    assert.equal(task.courseName, 'Hukum Dagang');

    database.close();
  });

  test('mengosongkan relasi mata kuliah menjadikan tugas mandiri (AC-C3)', async (t) => {
    const database = await withEmptyDatabase(t);

    const scheduleId = await createSchedule(database, {
      courseName: 'Statistika',
      dayOfWeek: 3,
      startTime: '08:00',
      endTime: '09:40',
      room: null,
      reminderMinutes: 30,
    });
    const schedule = await getScheduleById(database, scheduleId);
    const taskId = await createTask(database, {
      title: 'Latihan',
      deadlineAt: DEADLINE.sedang,
      courseId: schedule.courseId,
    });

    await updateTask(database, taskId, { title: 'Latihan', deadlineAt: DEADLINE.sedang, courseId: null });

    const task = await getTaskById(database, taskId);
    assert.equal(task.courseId, null);
    assert.equal(task.courseName, null);
    assert.deepEqual(
      (await listCourses(database)).map((course) => course.name),
      ['Statistika'],
      'mata kuliah masih dipakai jadwal → tetap ada'
    );

    database.close();
  });
});

describe('TUGAS — status selesai', () => {
  test('menandai selesai mengeluarkan tugas dari daftar pending (FR-C4)', async (t) => {
    const database = await withEmptyDatabase(t);

    const id = await createTask(database, { title: 'Selesai', deadlineAt: DEADLINE.dekat, courseId: null });
    await setTaskCompleted(database, id, true);

    const task = await getTaskById(database, id);
    assert.equal(task.isCompleted, true);
    assert.equal((await getPendingTasks(database)).length, 0);
    assert.equal((await getAllTasks(database)).length, 1, 'tetap ada di daftar lengkap');

    database.close();
  });

  test('membuka kembali mengembalikan tugas ke pending pada urutan deadline yang benar (AC-C4)', async (t) => {
    const database = await withEmptyDatabase(t);

    const dekat = await createTask(database, { title: 'Dekat', deadlineAt: DEADLINE.dekat, courseId: null });
    const sedang = await createTask(database, { title: 'Sedang', deadlineAt: DEADLINE.sedang, courseId: null });
    await createTask(database, { title: 'Jauh', deadlineAt: DEADLINE.jauh, courseId: null });

    await setTaskCompleted(database, dekat, true);
    await setTaskCompleted(database, sedang, true);
    assert.deepEqual((await getPendingTasks(database)).map((task) => task.title), ['Jauh']);

    await setTaskCompleted(database, dekat, false);
    await setTaskCompleted(database, sedang, false);

    assert.deepEqual(
      (await getPendingTasks(database)).map((task) => task.title),
      ['Dekat', 'Sedang', 'Jauh']
    );

    database.close();
  });

  test('membuka kembali tugas yang tidak ada tidak membuat baris baru', async (t) => {
    const database = await withEmptyDatabase(t);

    await setTaskCompleted(database, 9999, true);
    assert.equal((await getAllTasks(database)).length, 0);

    database.close();
  });
});

describe('TUGAS — urutan deadline', () => {
  test('daftar pending urut deadline menaik sehingga yang terlambat ada di atas', async (t) => {
    const database = await withEmptyDatabase(t);

    const sekarang = Date.UTC(2026, 10, 1, 12, 0);
    const terlambat = sekarang - 3 * 60 * 60 * 1000;
    const segera = sekarang + 2 * 60 * 60 * 1000;
    const nanti = sekarang + 72 * 60 * 60 * 1000;

    await createTask(database, { title: 'Nanti', deadlineAt: nanti, courseId: null });
    await createTask(database, { title: 'Terlambat', deadlineAt: terlambat, courseId: null });
    await createTask(database, { title: 'Segera', deadlineAt: segera, courseId: null });

    assert.deepEqual(
      (await getPendingTasks(database)).map((task) => task.title),
      ['Terlambat', 'Segera', 'Nanti']
    );

    database.close();
  });

  test('deadline sama diurutkan stabil menurut id', async (t) => {
    const database = await withEmptyDatabase(t);

    const first = await createTask(database, { title: 'Pertama', deadlineAt: DEADLINE.dekat, courseId: null });
    const second = await createTask(database, { title: 'Kedua', deadlineAt: DEADLINE.dekat, courseId: null });

    const ids = (await getPendingTasks(database)).map((task) => task.id);
    assert.deepEqual(ids, [first, second]);

    database.close();
  });
});
