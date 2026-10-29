/**
 * db/schema.ts
 *
 * Definisi skema SQLite. Tidak mengimpor `expo-sqlite` (type-only pun tidak),
 * sehingga DDL ini bisa diuji langsung dengan mesin SQLite lain tanpa React Native.
 *
 * Konvensi waktu:
 * - `schedules.day_of_week`: bilangan bulat 0–6 mengikuti `Date.prototype.getDay()`
 *   milik JavaScript — 0 = Minggu, 1 = Senin, …, 6 = Sabtu. Konvensi ini dipilih
 *   agar `new Date().getDay()` bisa dipakai langsung tanpa konversi.
 * - `schedules.start_time` / `end_time`: TEXT 'HH:mm' 24 jam, zero-padded,
 *   waktu lokal pengguna (bukan UTC), karena jadwal kuliah bersifat jam dinding.
 * - `tasks.deadline_at`: INTEGER epoch milidetik UTC. Satu angka absolut yang
 *   konsisten, mudah diurutkan (`ORDER BY deadline_at`), dan mudah diformat ke
 *   waktu lokal perangkat (`new Date(deadline_at).toLocaleString()`).
 *
 * Identitas mata kuliah (skema v2):
 * - Sejak v2, mata kuliah adalah entitas sendiri (`courses`). Satu mata kuliah
 *   boleh punya BANYAK entri jadwal mingguan (mis. kuliah + responsi) dan
 *   BANYAK tugas.
 * - `schedules.course_id` dan `tasks.course_id` menunjuk `courses.id`. Inilah
 *   relasi yang dipakai aplikasi.
 * - `schedules.course_name` (v1) dan `tasks.schedule_id` (v1) DIPERTAHANKAN
 *   hanya demi kompatibilitas data lama: `course_name` masih ditulis sebagai
 *   salinan nama (karena kolomnya NOT NULL + UNIQUE sejak v1) dan
 *   `schedule_id` tidak lagi dipakai UI. Keduanya bukan sumber kebenaran lagi.
 */

/** Versi skema saat ini, disimpan di `PRAGMA user_version`. */
export const SCHEMA_VERSION = 2;

/**
 * Ambang "deadline dekat" untuk penentuan warna amber vs info (brief 11):
 * deadline ≤ 24 jam memakai `deadline`, > 24 jam memakai `info`.
 * Dipakai nanti di lapisan tampilan; diletakkan di sini agar definisinya tunggal.
 */
export const DEADLINE_SOON_MS = 24 * 60 * 60 * 1000;

/**
 * Skema versi 1. Seluruh pernyataan dijalankan sekali di dalam satu transaksi
 * oleh `db/database.ts`.
 */
export const SCHEMA_V1_SQL = `
CREATE TABLE IF NOT EXISTS schedules (
  id               INTEGER PRIMARY KEY,
  course_name      TEXT    NOT NULL CHECK (length(trim(course_name)) > 0),
  day_of_week      INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time       TEXT    NOT NULL CHECK (
                     length(start_time) = 5
                     AND start_time GLOB '[0-2][0-9]:[0-5][0-9]'
                     AND CAST(substr(start_time, 1, 2) AS INTEGER) BETWEEN 0 AND 23
                   ),
  end_time         TEXT    NOT NULL CHECK (
                     length(end_time) = 5
                     AND end_time GLOB '[0-2][0-9]:[0-5][0-9]'
                     AND CAST(substr(end_time, 1, 2) AS INTEGER) BETWEEN 0 AND 23
                     AND end_time > start_time
                   ),
  room             TEXT             CHECK (room IS NULL OR length(trim(room)) > 0),
  reminder_minutes INTEGER NOT NULL DEFAULT 15
                     CHECK (reminder_minutes BETWEEN 0 AND 1440),
  UNIQUE (day_of_week, start_time, course_name)
);

CREATE TABLE IF NOT EXISTS tasks (
  id           INTEGER PRIMARY KEY,
  title        TEXT    NOT NULL CHECK (length(trim(title)) > 0),
  deadline_at  INTEGER NOT NULL CHECK (deadline_at > 0),
  is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  schedule_id  INTEGER          REFERENCES schedules(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_schedules_day
  ON schedules (day_of_week, start_time);

CREATE INDEX IF NOT EXISTS idx_tasks_pending_deadline
  ON tasks (deadline_at) WHERE is_completed = 0;

CREATE INDEX IF NOT EXISTS idx_tasks_schedule
  ON tasks (schedule_id);
`;

/**
 * Skema versi 2 — identitas mata kuliah.
 *
 * Bersifat ADITIF: tidak ada tabel yang dibuat ulang dan tidak ada data yang
 * dihapus. Kolom baru ditambahkan lalu diisi (backfill) dari data v1 yang ada,
 * sehingga jadwal, tugas, deadline, dan status selesai milik pengguna tetap
 * utuh.
 */
export const SCHEMA_V2_SQL = `
CREATE TABLE IF NOT EXISTS courses (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE CHECK (length(trim(name)) > 0),
  UNIQUE (name)
);

-- Satu baris per nama mata kuliah yang sudah ada di jadwal v1.
INSERT OR IGNORE INTO courses (name)
SELECT DISTINCT trim(course_name) FROM schedules ORDER BY trim(course_name);

-- Relasi jadwal -> mata kuliah (nullable karena ADD COLUMN tidak boleh NOT NULL
-- tanpa nilai default; seluruh baris lama langsung diisi di bawah).
ALTER TABLE schedules ADD COLUMN course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;

UPDATE schedules
   SET course_id = (SELECT c.id FROM courses c WHERE c.name = trim(schedules.course_name))
 WHERE course_id IS NULL;

-- Relasi tugas -> mata kuliah, di-backfill dari jadwal yang ditautkan di v1.
ALTER TABLE tasks ADD COLUMN course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL;

UPDATE tasks
   SET course_id = (SELECT s.course_id FROM schedules s WHERE s.id = tasks.schedule_id)
 WHERE course_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_course ON schedules (course_id);
CREATE INDEX IF NOT EXISTS idx_tasks_course ON tasks (course_id);
`;
