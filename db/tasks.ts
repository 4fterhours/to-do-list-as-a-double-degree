/**
 * db/tasks.ts
 *
 * Pembacaan dan penulisan tugas.
 *
 * Relasi mata kuliah memakai `tasks.course_id` (skema v2). `tasks.schedule_id`
 * warisan v1 tidak ditulis lagi, tetapi tetap dibaca agar data lama utuh.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { deleteUnusedCourses } from './courses';
import type { Task } from './types';

type TaskRow = {
  id: number;
  title: string;
  deadline_at: number;
  is_completed: number;
  schedule_id: number | null;
  course_id: number | null;
  course_name: string | null;
};

/**
 * Nama mata kuliah diambil dari `courses` (v2). Untuk baris lama yang belum
 * punya `course_id`, dipakai `schedules.course_name` lewat `schedule_id`
 * sebagai cadangan supaya label tidak hilang.
 */
const SELECT_TASK = `
  SELECT
    tasks.id,
    tasks.title,
    tasks.deadline_at,
    tasks.is_completed,
    tasks.schedule_id,
    tasks.course_id,
    COALESCE(courses.name, schedules.course_name) AS course_name
  FROM tasks
  LEFT JOIN courses ON courses.id = tasks.course_id
  LEFT JOIN schedules ON schedules.id = tasks.schedule_id
`;

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    deadlineAt: row.deadline_at,
    isCompleted: row.is_completed === 1,
    courseId: row.course_id,
    courseName: row.course_name,
    scheduleId: row.schedule_id,
  };
}

/** Tugas yang belum selesai, urut deadline menaik (terlambat otomatis di atas). */
export async function getPendingTasks(db: SQLiteDatabase): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `${SELECT_TASK} WHERE tasks.is_completed = 0 ORDER BY tasks.deadline_at ASC, tasks.id ASC`
  );

  return rows.map(toTask);
}

/** Semua tugas (selesai maupun belum), urut deadline menaik. */
export async function getAllTasks(db: SQLiteDatabase): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `${SELECT_TASK} ORDER BY tasks.deadline_at ASC, tasks.id ASC`
  );

  return rows.map(toTask);
}

export async function getTaskById(db: SQLiteDatabase, id: number): Promise<Task | null> {
  const row = await db.getFirstAsync<TaskRow>(`${SELECT_TASK} WHERE tasks.id = ?`, id);
  return row ? toTask(row) : null;
}

/** Data yang dibutuhkan untuk menulis tugas (sudah divalidasi di lapisan UI). */
export type TaskInput = {
  title: string;
  deadlineAt: number;
  courseId: number | null;
};

export async function createTask(db: SQLiteDatabase, input: TaskInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO tasks (title, deadline_at, is_completed, course_id)
     VALUES (?, ?, 0, ?)`,
    input.title.trim(),
    input.deadlineAt,
    input.courseId
  );

  return result.lastInsertRowId;
}

export async function updateTask(
  db: SQLiteDatabase,
  id: number,
  input: TaskInput
): Promise<void> {
  await db.runAsync(
    `UPDATE tasks SET title = ?, deadline_at = ?, course_id = ? WHERE id = ?`,
    input.title.trim(),
    input.deadlineAt,
    input.courseId,
    id
  );

  await deleteUnusedCourses(db);
}

export async function deleteTask(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
  await deleteUnusedCourses(db);
}

/** Menandai selesai / membuka kembali tugas. */
export async function setTaskCompleted(
  db: SQLiteDatabase,
  id: number,
  completed: boolean
): Promise<void> {
  await db.runAsync('UPDATE tasks SET is_completed = ? WHERE id = ?', completed ? 1 : 0, id);
}
