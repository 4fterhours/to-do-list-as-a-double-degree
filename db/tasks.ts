/**
 * db/tasks.ts
 *
 * Pembacaan tugas. Tanpa operasi tulis: aplikasi belum punya CRUD.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { Task } from './types';

type TaskRow = {
  id: number;
  title: string;
  deadline_at: number;
  is_completed: number;
  schedule_id: number | null;
  course_name: string | null;
};

/**
 * `course_name` diambil lewat LEFT JOIN agar baris tugas bisa menampilkan nama
 * mata kuliah tanpa query tambahan per baris. LEFT JOIN (bukan INNER) penting:
 * tugas tanpa jadwal tetap muncul, termasuk yang `schedule_id`-nya menjadi
 * NULL setelah jadwalnya dihapus.
 */
const SELECT_TASK = `
  SELECT
    tasks.id,
    tasks.title,
    tasks.deadline_at,
    tasks.is_completed,
    tasks.schedule_id,
    schedules.course_name AS course_name
  FROM tasks
  LEFT JOIN schedules ON schedules.id = tasks.schedule_id
`;

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    deadlineAt: row.deadline_at,
    isCompleted: row.is_completed === 1,
    scheduleId: row.schedule_id,
    courseName: row.course_name,
  };
}

/**
 * Tugas yang belum selesai, urut deadline menaik.
 *
 * `deadline_at` adalah epoch milidetik UTC, jadi urutan ASC otomatis
 * menempatkan tugas terlambat (deadline paling lampau) di urutan teratas —
 * sesuai brief 02. Warna/urgensi (`overdue` / `deadline` / `info`) ditentukan
 * di lapisan tampilan dengan membandingkan `deadlineAt` terhadap waktu now.
 */
export async function getPendingTasks(db: SQLiteDatabase): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `${SELECT_TASK} WHERE tasks.is_completed = 0 ORDER BY tasks.deadline_at ASC, tasks.id ASC`
  );

  return rows.map(toTask);
}
