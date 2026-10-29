/**
 * db/types.ts
 *
 * Tipe domain hasil pembacaan database. Memakai camelCase agar nyaman dipakai
 * komponen; pemetaan dari kolom snake_case dilakukan di `db/schedules.ts` dan
 * `db/tasks.ts`.
 */

/** Mata kuliah: identitas yang dipakai bersama oleh jadwal dan tugas. */
export type Course = {
  id: number;
  name: string;
};

/** Satu entri jadwal kuliah yang berulang setiap minggu. */
export type Schedule = {
  id: number;
  courseName: string;
  /**
   * Relasi ke `courses.id` — identitas mata kuliah (skema v2).
   * Null hanya mungkin untuk baris yang belum ter-backfill; tidak pernah diisi
   * nilai sentinel seperti 0, karena 0 bukan id yang sah dan akan melanggar
   * foreign key bila dipakai untuk menulis.
   */
  courseId: number | null;
  /** 0 = Minggu … 6 = Sabtu (konvensi `Date.getDay()`). */
  dayOfWeek: number;
  /** 'HH:mm' waktu lokal. */
  startTime: string;
  /** 'HH:mm' waktu lokal. */
  endTime: string;
  /** Null bila ruang belum diketahui. */
  room: string | null;
  /** Menit pengingat sebelum kelas dimulai. */
  reminderMinutes: number;
};

/** Satu tugas dengan deadline absolut. */
export type Task = {
  id: number;
  title: string;
  /** Epoch milidetik UTC. */
  deadlineAt: number;
  isCompleted: boolean;
  /**
   * Relasi opsional ke `courses.id` — identitas mata kuliah. Satu mata kuliah
   * boleh punya banyak tugas dan banyak entri jadwal.
   */
  courseId: number | null;
  /** Nama mata kuliah hasil join; null bila relasi dikosongkan. */
  courseName: string | null;
  /**
   * Warisan skema v1: menunjuk SATU entri jadwal mingguan, sehingga tidak bisa
   * mewakili mata kuliah yang punya beberapa sesi. Tidak ditulis lagi oleh UI
   * dan hanya dipertahankan agar data lama tidak hilang.
   */
  scheduleId: number | null;
};
