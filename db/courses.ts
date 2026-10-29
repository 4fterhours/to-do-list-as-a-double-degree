/**
 * db/courses.ts
 *
 * Mata kuliah sebagai identitas (skema v2). Satu mata kuliah boleh punya
 * beberapa entri jadwal mingguan dan beberapa tugas.
 *
 * Tidak ada layar CRUD mata kuliah tersendiri: mata kuliah lahir dari form
 * jadwal (nama yang diketik) dan dipakai ulang oleh form tugas. Mata kuliah
 * yang tidak lagi dipakai jadwal maupun tugas dibersihkan agar pemilih tidak
 * penuh sampah.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { Course } from './types';

type CourseRow = {
  id: number;
  name: string;
};

/** Semua mata kuliah, urut abjad. */
export async function listCourses(db: SQLiteDatabase): Promise<Course[]> {
  const rows = await db.getAllAsync<CourseRow>(
    'SELECT id, name FROM courses ORDER BY name COLLATE NOCASE ASC'
  );

  return rows.map((row) => ({ id: row.id, name: row.name }));
}

/**
 * Mencari mata kuliah berdasarkan nama (tanpa membedakan huruf besar/kecil,
 * karena kolom `name` memakai COLLATE NOCASE) atau membuatnya bila belum ada.
 * Nama sudah dirapikan pemanggil (trim).
 */
export async function findOrCreateCourse(db: SQLiteDatabase, name: string): Promise<number> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Nama mata kuliah tidak boleh kosong.');
  }

  const existing = await db.getFirstAsync<CourseRow>(
    'SELECT id, name FROM courses WHERE name = ?',
    trimmed
  );
  if (existing) {
    return existing.id;
  }

  const result = await db.runAsync('INSERT INTO courses (name) VALUES (?)', trimmed);
  return result.lastInsertRowId;
}

/**
 * Menghapus mata kuliah yang tidak lagi dipakai jadwal maupun tugas.
 * Dipanggil setelah jadwal/tugas dihapus agar pemilih mata kuliah tetap rapi.
 */
export async function deleteUnusedCourses(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    `DELETE FROM courses
      WHERE id NOT IN (SELECT course_id FROM schedules WHERE course_id IS NOT NULL)
        AND id NOT IN (SELECT course_id FROM tasks WHERE course_id IS NOT NULL)`
  );
}
