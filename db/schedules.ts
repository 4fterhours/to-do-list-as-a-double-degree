/**
 * db/schedules.ts
 *
 * Pembacaan jadwal. Tanpa operasi tulis: aplikasi belum punya CRUD.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { Schedule } from './types';

type ScheduleRow = {
  id: number;
  course_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  reminder_minutes: number;
};

const SELECT_SCHEDULE = `
  SELECT id, course_name, day_of_week, start_time, end_time, room, reminder_minutes
  FROM schedules
`;

function toSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    courseName: row.course_name,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    room: row.room,
    reminderMinutes: row.reminder_minutes,
  };
}

/**
 * Jadwal satu hari, urut jam mulai. `dayOfWeek` 0 = Minggu … 6 = Sabtu,
 * sama dengan `Date.prototype.getDay()`, sehingga pemanggil bisa langsung
 * memakai `new Date().getDay()`.
 */
export async function getSchedulesForDay(
  db: SQLiteDatabase,
  dayOfWeek: number
): Promise<Schedule[]> {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new RangeError(`dayOfWeek harus bilangan bulat 0–6, diterima: ${dayOfWeek}`);
  }

  const rows = await db.getAllAsync<ScheduleRow>(
    `${SELECT_SCHEDULE} WHERE day_of_week = ? ORDER BY start_time ASC, id ASC`,
    dayOfWeek
  );

  return rows.map(toSchedule);
}
