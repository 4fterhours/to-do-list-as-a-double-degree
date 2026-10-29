/**
 * db/schedules.ts
 *
 * Pembacaan dan penulisan jadwal kuliah mingguan.
 *
 * Kolom warisan v1 `course_name` tetap ditulis sebagai salinan nama mata
 * kuliah, karena kolom itu NOT NULL + UNIQUE sejak v1. Sumber kebenaran
 * relasi tetap `course_id`.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { deleteUnusedCourses, findOrCreateCourse } from './courses';
import type { Schedule } from './types';

type ScheduleRow = {
  id: number;
  course_name: string;
  course_id: number | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  reminder_minutes: number;
};

const SELECT_SCHEDULE = `
  SELECT
    schedules.id,
    schedules.course_name,
    schedules.course_id,
    schedules.day_of_week,
    schedules.start_time,
    schedules.end_time,
    schedules.room,
    schedules.reminder_minutes
  FROM schedules
`;

function toSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    courseName: row.course_name,
    courseId: row.course_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    room: row.room,
    reminderMinutes: row.reminder_minutes,
  };
}

/** Jadwal satu hari, urut jam mulai. `dayOfWeek` 0 = Minggu … 6 = Sabtu. */
export async function getSchedulesForDay(
  db: SQLiteDatabase,
  dayOfWeek: number
): Promise<Schedule[]> {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new RangeError(`dayOfWeek harus bilangan bulat 0–6, diterima: ${dayOfWeek}`);
  }

  const rows = await db.getAllAsync<ScheduleRow>(
    `${SELECT_SCHEDULE} WHERE schedules.day_of_week = ? ORDER BY schedules.start_time ASC, schedules.id ASC`,
    dayOfWeek
  );

  return rows.map(toSchedule);
}

/** Seluruh jadwal mingguan, urut hari lalu jam mulai. */
export async function getAllSchedules(db: SQLiteDatabase): Promise<Schedule[]> {
  const rows = await db.getAllAsync<ScheduleRow>(
    `${SELECT_SCHEDULE} ORDER BY schedules.day_of_week ASC, schedules.start_time ASC, schedules.id ASC`
  );

  return rows.map(toSchedule);
}

export async function getScheduleById(
  db: SQLiteDatabase,
  id: number
): Promise<Schedule | null> {
  const row = await db.getFirstAsync<ScheduleRow>(`${SELECT_SCHEDULE} WHERE schedules.id = ?`, id);
  return row ? toSchedule(row) : null;
}

/**
 * Galat jadwal duplikat: mata kuliah yang sama tidak boleh punya dua sesi pada
 * hari dan jam mulai yang sama. Pesannya sudah siap ditampilkan ke pengguna,
 * karena constraint `UNIQUE` bawaan SQLite hanya menghasilkan teks teknis.
 */
export class DuplicateScheduleError extends Error {
  constructor() {
    super(
      'Jadwal mata kuliah ini pada hari dan jam mulai tersebut sudah ada. ' +
        'Ubah jam mulai, pilih hari lain, atau pilih mata kuliah lain.'
    );
    this.name = 'DuplicateScheduleError';
  }
}

/**
 * Memeriksa bentrok sebelum menulis. Perbandingan nama memakai COLLATE NOCASE
 * agar "Hukum Dagang" dan "hukum dagang" dianggap mata kuliah yang sama —
 * sama seperti `courses.name`. `excludeId` dipakai saat mengubah jadwal supaya
 * baris itu tidak dianggap bentrok dengan dirinya sendiri.
 */
async function assertNoDuplicateSchedule(
  db: SQLiteDatabase,
  courseName: string,
  dayOfWeek: number,
  startTime: string,
  excludeId: number | null
): Promise<void> {
  const conflict =
    excludeId === null
      ? await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM schedules
            WHERE day_of_week = ? AND start_time = ? AND course_name = ? COLLATE NOCASE
            LIMIT 1`,
          dayOfWeek,
          startTime,
          courseName
        )
      : await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM schedules
            WHERE day_of_week = ? AND start_time = ? AND course_name = ? COLLATE NOCASE
              AND id <> ?
            LIMIT 1`,
          dayOfWeek,
          startTime,
          courseName,
          excludeId
        );

  if (conflict) {
    throw new DuplicateScheduleError();
  }
}

/** Menormalkan pelanggaran UNIQUE dari SQLite menjadi galat yang ramah dibaca. */
function asDuplicateAwareError(error: unknown): unknown {
  if (error instanceof DuplicateScheduleError) {
    return error;
  }
  if (error instanceof Error && error.message.includes('UNIQUE constraint failed: schedules')) {
    return new DuplicateScheduleError();
  }
  return error;
}

/** Data yang dibutuhkan untuk menulis jadwal (sudah divalidasi di lapisan UI). */
export type ScheduleInput = {
  courseName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  reminderMinutes: number;
};

export async function createSchedule(db: SQLiteDatabase, input: ScheduleInput): Promise<number> {
  const courseName = input.courseName.trim();

  await assertNoDuplicateSchedule(db, courseName, input.dayOfWeek, input.startTime, null);

  const courseId = await findOrCreateCourse(db, courseName);

  try {
    const result = await db.runAsync(
      `INSERT INTO schedules
         (course_name, course_id, day_of_week, start_time, end_time, room, reminder_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      courseName,
      courseId,
      input.dayOfWeek,
      input.startTime,
      input.endTime,
      input.room,
      input.reminderMinutes
    );

    return result.lastInsertRowId;
  } catch (error) {
    throw asDuplicateAwareError(error);
  }
}

export async function updateSchedule(
  db: SQLiteDatabase,
  id: number,
  input: ScheduleInput
): Promise<void> {
  const courseName = input.courseName.trim();
  const previous = await getScheduleById(db, id);

  await assertNoDuplicateSchedule(db, courseName, input.dayOfWeek, input.startTime, id);

  const courseId = await findOrCreateCourse(db, courseName);

  try {
    await db.runAsync(
      `UPDATE schedules
          SET course_name = ?, course_id = ?, day_of_week = ?, start_time = ?,
              end_time = ?, room = ?, reminder_minutes = ?
        WHERE id = ?`,
      courseName,
      courseId,
      input.dayOfWeek,
      input.startTime,
      input.endTime,
      input.room,
      input.reminderMinutes,
      id
    );
  } catch (error) {
    throw asDuplicateAwareError(error);
  }

  // Bila jadwal ini pindah ke mata kuliah lain, mata kuliah lama bisa menjadi
  // yatim. Tugas yang menunjuk mata kuliah lama tetap utuh (relasinya
  // `tasks.course_id`, bukan sesi jadwal ini).
  if (previous && previous.courseId !== courseId) {
    await deleteUnusedCourses(db);
  }
}

/**
 * Menghapus jadwal. Tugas yang dulu tertaut ke entri jadwal ini tidak ikut
 * terhapus: relasi tugas memakai `course_id` (ON DELETE SET NULL hanya
 * berlaku bila mata kuliahnya dihapus). `tasks.schedule_id` menjadi NULL
 * karena constraint v1.
 */
export async function deleteSchedule(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM schedules WHERE id = ?', id);
  await deleteUnusedCourses(db);
}
