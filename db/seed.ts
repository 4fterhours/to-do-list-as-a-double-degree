/**
 * db/seed.ts
 *
 * Data contoh ilustratif. Dijalankan HANYA dari migrasi versi 1
 * (`db/database.ts`), sehingga tidak pernah mengubah deadline atau status
 * tugas pada pembukaan aplikasi berikutnya.
 *
 * Semua nama mata kuliah dan ruang bersifat contoh, bukan data kampus
 * terverifikasi. Jadwal berulang mingguan; deadline dihitung dari waktu lokal
 * perangkat saat database pertama kali dibuat, agar contoh tetap relevan.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

type ScheduleSeed = {
  id: number;
  courseName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  reminderMinutes: number;
};

type TaskSeed = {
  id: number;
  title: string;
  deadlineAt: number;
  isCompleted: boolean;
  scheduleId: number | null;
};

/**
 * Jadwal mingguan. `dayOfWeek` 0 = Minggu … 6 = Sabtu.
 * Tiga kelas hari Senin berakhir pukul 16.40, sama seperti contoh pada brief 11.
 */
const SCHEDULE_SEEDS: readonly ScheduleSeed[] = [
  {
    id: 1,
    courseName: 'Hukum Dagang',
    dayOfWeek: 1,
    startTime: '10:00',
    endTime: '11:40',
    room: 'B-204',
    reminderMinutes: 15,
  },
  {
    id: 2,
    courseName: 'Pemrograman Web',
    dayOfWeek: 1,
    startTime: '13:00',
    endTime: '14:40',
    room: 'Lab Komputer 2',
    reminderMinutes: 10,
  },
  {
    id: 3,
    courseName: 'Hukum Internasional',
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '16:40',
    room: 'C-101',
    reminderMinutes: 15,
  },
  {
    id: 4,
    courseName: 'Metodologi Penelitian Hukum',
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '10:40',
    // Ruang sengaja null: contoh kolom yang boleh kosong bila belum diketahui.
    room: null,
    reminderMinutes: 15,
  },
];

/**
 * Membuat epoch milidetik dari tanggal lokal perangkat.
 * `new Date(y, m, d, h, min)` memakai zona waktu lokal, bukan UTC.
 */
function localDeadlineAt(now: Date, dayOffset: number, hour: number, minute: number): number {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + dayOffset,
    hour,
    minute,
    0,
    0
  ).getTime();
}

/**
 * Tugas contoh, dibuat relatif terhadap `now`. Tiga tugas belum selesai
 * menguji tiga kondisi urgensi sekaligus:
 * - kemarin 23.59  → terlambat (`overdue`)
 * - hari ini 23.59 → ≤ 24 jam (`deadline`, amber)
 * - +2 hari 23.59  → > 24 jam (`info`)
 * Satu tugas sudah selesai dipakai untuk menguji filter `is_completed = 0`.
 */
function buildTaskSeeds(now: Date): TaskSeed[] {
  return [
    {
      id: 1,
      title: 'Ringkasan Sengketa Laut Natuna',
      deadlineAt: localDeadlineAt(now, -1, 23, 59),
      isCompleted: false,
      scheduleId: 3,
    },
    {
      id: 2,
      title: 'Analisis Putusan Pengadilan',
      deadlineAt: localDeadlineAt(now, 0, 23, 59),
      isCompleted: false,
      scheduleId: 1,
    },
    {
      id: 3,
      title: 'Laporan Praktikum Basis Data',
      deadlineAt: localDeadlineAt(now, 2, 23, 59),
      isCompleted: false,
      scheduleId: 2,
    },
    {
      id: 4,
      title: 'Latihan Soal Hukum Perikatan',
      deadlineAt: localDeadlineAt(now, 0, 12, 0),
      isCompleted: true,
      scheduleId: 1,
    },
  ];
}

/**
 * Menulis data contoh. `INSERT OR IGNORE` + id eksplisit membuat operasi ini
 * idempoten: bila terpanggil ulang, baris yang sudah ada dilewati (tidak
 * menduplikasi dan tidak menimpa perubahan pengguna).
 *
 * Harus dipanggil di dalam transaksi migrasi; fungsi ini tidak membuka
 * transaksi sendiri.
 */
export async function seedInitialData(db: SQLiteDatabase, now: Date = new Date()): Promise<void> {
  for (const schedule of SCHEDULE_SEEDS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO schedules
         (id, course_name, day_of_week, start_time, end_time, room, reminder_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      schedule.id,
      schedule.courseName,
      schedule.dayOfWeek,
      schedule.startTime,
      schedule.endTime,
      schedule.room,
      schedule.reminderMinutes
    );
  }

  for (const task of buildTaskSeeds(now)) {
    await db.runAsync(
      `INSERT OR IGNORE INTO tasks (id, title, deadline_at, is_completed, schedule_id)
       VALUES (?, ?, ?, ?, ?)`,
      task.id,
      task.title,
      task.deadlineAt,
      task.isCompleted ? 1 : 0,
      task.scheduleId
    );
  }
}
