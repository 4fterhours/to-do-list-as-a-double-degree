/**
 * lib/validation.ts
 *
 * Validasi form jadwal & tugas. Fungsi murni tanpa impor React Native,
 * sehingga bisa diuji langsung di Node.
 *
 * Semua fungsi mengembalikan `null` bila valid, atau pesan kesalahan berbahasa
 * Indonesia yang siap ditampilkan di bawah field.
 */

import { clockToMinutes } from './time';

/** Batas panjang teks agar layout tetap wajar dan CHECK tidak terkejut. */
export const MAX_COURSE_NAME_LENGTH = 80;
export const MAX_TASK_TITLE_LENGTH = 140;
export const MAX_ROOM_LENGTH = 40;

/** Rentang menit pengingat yang sama dengan CHECK di skema (0–1440). */
export const MIN_REMINDER_MINUTES = 0;
export const MAX_REMINDER_MINUTES = 1440;
export const DEFAULT_REMINDER_MINUTES = 15;

export function validateCourseName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Nama mata kuliah wajib diisi.';
  }
  if (trimmed.length > MAX_COURSE_NAME_LENGTH) {
    return `Nama mata kuliah maksimal ${MAX_COURSE_NAME_LENGTH} karakter.`;
  }
  return null;
}

export function validateTaskTitle(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Judul tugas wajib diisi.';
  }
  if (trimmed.length > MAX_TASK_TITLE_LENGTH) {
    return `Judul tugas maksimal ${MAX_TASK_TITLE_LENGTH} karakter.`;
  }
  return null;
}

export function validateRoom(value: string): string | null {
  if (value.trim().length > MAX_ROOM_LENGTH) {
    return `Nama ruang maksimal ${MAX_ROOM_LENGTH} karakter.`;
  }
  return null;
}

/** Format jam 'HH:mm' 24 jam, zero-padded. */
export function validateClock(value: string): string | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return 'Jam harus berformat HH:mm, misalnya 09.00 ditulis 09:00.';
  }
  return null;
}

/** Jam selesai harus setelah jam mulai. */
export function validateTimeRange(startTime: string, endTime: string): string | null {
  const startError = validateClock(startTime);
  if (startError) {
    return 'Jam mulai belum benar.';
  }
  const endError = validateClock(endTime);
  if (endError) {
    return 'Jam selesai belum benar.';
  }
  if (clockToMinutes(endTime) <= clockToMinutes(startTime)) {
    return 'Jam selesai harus setelah jam mulai.';
  }
  return null;
}

export function validateDayOfWeek(value: number): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 6) {
    return 'Pilih hari dalam minggu.';
  }
  return null;
}

/** Menit pengingat: teks dari input, harus bilangan bulat 0–1440. */
export function validateReminderMinutes(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Menit pengingat wajib diisi.';
  }
  if (!/^\d{1,4}$/.test(trimmed)) {
    return 'Menit pengingat harus berupa angka bulat.';
  }
  const minutes = Number(trimmed);
  if (minutes < MIN_REMINDER_MINUTES || minutes > MAX_REMINDER_MINUTES) {
    return `Menit pengingat harus antara ${MIN_REMINDER_MINUTES} dan ${MAX_REMINDER_MINUTES}.`;
  }
  return null;
}

/**
 * Deadline tugas. Waktu boleh di masa lalu (tugas bisa dicatat setelah lewat),
 * tetapi harus tanggal yang sah dan nilai epoch yang positif.
 */
export function validateDeadline(deadlineAt: number): string | null {
  if (!Number.isFinite(deadlineAt) || deadlineAt <= 0) {
    return 'Tanggal dan waktu deadline belum benar.';
  }
  return null;
}

/** Ruang kosong disimpan sebagai NULL, bukan string kosong. */
export function normalizeRoom(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Gabungan validasi form jadwal; mengembalikan peta error per field. */
export type ScheduleFormErrors = {
  courseName?: string;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: string;
  reminderMinutes?: string;
  room?: string;
};

export type ScheduleFormValues = {
  courseName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  reminderMinutes: string;
};

export function validateScheduleForm(values: ScheduleFormValues): ScheduleFormErrors {
  const errors: ScheduleFormErrors = {};

  const courseError = validateCourseName(values.courseName);
  if (courseError) errors.courseName = courseError;

  const dayError = validateDayOfWeek(values.dayOfWeek);
  if (dayError) errors.dayOfWeek = dayError;

  const startError = validateClock(values.startTime);
  if (startError) errors.startTime = startError;

  const rangeError = validateTimeRange(values.startTime, values.endTime);
  if (rangeError) {
    // Tandai field yang paling mungkin bermasalah.
    if (!startError) errors.endTime = rangeError;
  }

  const reminderError = validateReminderMinutes(values.reminderMinutes);
  if (reminderError) errors.reminderMinutes = reminderError;

  const roomError = validateRoom(values.room);
  if (roomError) errors.room = roomError;

  return errors;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}

/** Gabungan validasi form tugas. */
export type TaskFormErrors = {
  title?: string;
  deadlineAt?: string;
};

export function validateTaskForm(values: { title: string; deadlineAt: number }): TaskFormErrors {
  const errors: TaskFormErrors = {};

  const titleError = validateTaskTitle(values.title);
  if (titleError) errors.title = titleError;

  const deadlineError = validateDeadline(values.deadlineAt);
  if (deadlineError) errors.deadlineAt = deadlineError;

  return errors;
}
