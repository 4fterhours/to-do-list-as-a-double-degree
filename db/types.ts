/**
 * db/types.ts
 *
 * Tipe domain hasil pembacaan database. Memakai camelCase agar nyaman dipakai
 * komponen; pemetaan dari kolom snake_case dilakukan di `db/schedules.ts` dan
 * `db/tasks.ts`.
 */

/** Satu entri jadwal kuliah yang berulang setiap minggu. */
export type Schedule = {
  id: number;
  courseName: string;
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
   * FK opsional ke `schedules.id`. Karena proyek ini belum punya tabel
   * `courses`, relasi ini menunjuk ke SATU entri jadwal mata kuliah
   * (mis. "Pemrograman Web, Senin 13.00"), bukan ke mata kuliah secara umum.
   */
  scheduleId: number | null;
  /**
   * Nama mata kuliah dari jadwal yang ditautkan (LEFT JOIN). Null bila tugas
   * tidak terkait jadwal mana pun, atau jadwalnya sudah dihapus
   * (ON DELETE SET NULL).
   */
  courseName: string | null;
};
