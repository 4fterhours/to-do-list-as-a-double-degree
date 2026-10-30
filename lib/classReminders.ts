/**
 * lib/classReminders.ts
 *
 * Inti perhitungan pengingat kelas — MURNI, tanpa impor React Native, SQLite,
 * maupun `expo-notifications`, sehingga dapat diuji deterministik di Node.
 *
 * Isi:
 * - konversi hari database (0 = Minggu … 6 = Sabtu) ke konvensi trigger
 *   `expo-notifications` (1 = Minggu … 7 = Sabtu);
 * - perhitungan slot pengingat dari jam mulai − menit pengingat, termasuk
 *   pengingat yang melintasi tengah malam / berganti minggu;
 * - teks notifikasi;
 * - fingerprint konfigurasi jadwal;
 * - rekonsiliasi idempoten antara notifikasi terjadwal dan data SQLite.
 *
 * Konvensi waktu: slot selalu dinyatakan dalam jam dinding LOKAL perangkat
 * (`hour`/`minute` + `weekday`), bukan epoch. Dengan begitu trigger berulang
 * tetap benar saat pergantian minggu, dan penyesuaian zona waktu/DST dilakukan
 * oleh OS, bukan oleh aplikasi.
 */

import { clockToDisplay, clockToMinutes } from './time';

/* ------------------------------------------------------------------------- */
/* Konstanta                                                                  */
/* ------------------------------------------------------------------------- */

/** Nilai `content.data.type` untuk semua notifikasi pengingat kelas. */
export const CLASS_REMINDER_TYPE = 'class-reminder';

/** ID channel Android. Harus sama dengan yang dibuat di `lib/notifications.ts`. */
export const CLASS_REMINDER_CHANNEL_ID = 'class-reminders';

/**
 * Versi skema fingerprint. Naikkan bila arti fingerprint berubah, supaya semua
 * notifikasi lama dianggap usang dan dijadwalkan ulang.
 */
const FINGERPRINT_VERSION = 1;

const MINUTES_PER_DAY = 24 * 60;
const DAYS_PER_WEEK = 7;

/* ------------------------------------------------------------------------- */
/* Hari dalam minggu                                                          */
/* ------------------------------------------------------------------------- */

/**
 * Database memakai konvensi JavaScript: 0 = Minggu … 6 = Sabtu.
 * `expo-notifications` memakai konvensi Apple untuk `weekday`:
 * 1 = Minggu … 7 = Sabtu (lihat `WeeklyTriggerInput` di paketnya).
 *
 * Jadi konversinya sederhana: +1. Fungsi ini tetap dibuat eksplisit agar
 * konversi hanya ada di satu tempat dan bisa diuji.
 */
export function toExpoWeekday(dbDayOfWeek: number): number {
  if (!Number.isInteger(dbDayOfWeek) || dbDayOfWeek < 0 || dbDayOfWeek > 6) {
    throw new RangeError(`dayOfWeek harus bilangan bulat 0–6, diterima: ${dbDayOfWeek}`);
  }
  return dbDayOfWeek + 1;
}

/** Kebalikannya: 1 = Minggu … 7 = Sabtu → 0 = Minggu … 6 = Sabtu. */
export function fromExpoWeekday(expoWeekday: number): number {
  if (!Number.isInteger(expoWeekday) || expoWeekday < 1 || expoWeekday > 7) {
    throw new RangeError(`weekday expo harus bilangan bulat 1–7, diterima: ${expoWeekday}`);
  }
  return expoWeekday - 1;
}

/* ------------------------------------------------------------------------- */
/* Slot pengingat                                                             */
/* ------------------------------------------------------------------------- */

/** Data jadwal yang dibutuhkan untuk menghitung pengingat. */
export type ReminderSource = {
  id: number;
  courseName: string;
  dayOfWeek: number;
  /** 'HH:mm' waktu lokal. */
  startTime: string;
  room: string | null;
  /** 0–1440 menurut CHECK di skema. */
  reminderMinutes: number;
};

export type ReminderSlot = {
  /** 1 = Minggu … 7 = Sabtu (konvensi `expo-notifications`). */
  weekday: number;
  hour: number;
  minute: number;
  /** 0 = hari kelas, -1 = sehari sebelum kelas (pengingat melintasi tengah malam). */
  dayShift: number;
};

/**
 * Menghitung kapan pengingat harus berbunyi: jam mulai kelas dikurangi
 * `reminderMinutes`, dinyatakan sebagai (hari, jam, menit) lokal.
 *
 * Kasus yang ditangani:
 * - `reminderMinutes = 0` → pengingat tepat saat kelas dimulai (lihat catatan
 *   semantik di `PRD.md` §6.4).
 * - pengingat melewati tengah malam (mis. Senin 07.00 dengan 600 menit →
 *   Minggu 21.00) → `dayShift = -1` dan `weekday` ikut mundur, termasuk dari
 *   Senin ke Minggu.
 * - `reminderMinutes = 1440` (batas CHECK) → tepat 24 jam sebelum kelas:
 *   jam sama, hari mundur satu.
 */
export function reminderSlot(
  dayOfWeek: number,
  startTime: string,
  reminderMinutes: number
): ReminderSlot {
  if (!Number.isInteger(reminderMinutes) || reminderMinutes < 0 || reminderMinutes > 1440) {
    throw new RangeError(
      `reminderMinutes harus bilangan bulat 0–1440, diterima: ${reminderMinutes}`
    );
  }

  const startMinutes = clockToMinutes(startTime);
  const notifyMinutes = startMinutes - reminderMinutes;

  // Math.floor (bukan % yang bisa negatif) supaya -180 menit menjadi -1 hari.
  const dayShift = Math.floor(notifyMinutes / MINUTES_PER_DAY);
  const minuteOfDay = ((notifyMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

  // Perpindahan hari dibungkus 7 hari: Senin - 1 = Minggu, Minggu - 1 = Sabtu.
  const shiftedDbDay = (((dayOfWeek + dayShift) % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK;

  return {
    weekday: toExpoWeekday(shiftedDbDay),
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
    dayShift,
  };
}

/* ------------------------------------------------------------------------- */
/* Isi & fingerprint notifikasi                                               */
/* ------------------------------------------------------------------------- */

export type ReminderContent = {
  title: string;
  body: string;
};

/**
 * Teks notifikasi bahasa Indonesia sederhana (PRD §8). Ruang dihilangkan
 * dengan kalimat yang tetap natural bila belum diketahui.
 */
export function buildReminderContent(schedule: ReminderSource): ReminderContent {
  const courseName = schedule.courseName.trim();
  const time = clockToDisplay(schedule.startTime);
  const room = schedule.room?.trim();

  return {
    title: `${courseName} akan dimulai`,
    body: room
      ? `Kelas dimulai pukul ${time} di ruang ${room}. Persiapkan dirimu!`
      : `Kelas dimulai pukul ${time}. Persiapkan dirimu!`,
  };
}

/**
 * Sidik jari konfigurasi yang MEMENGARUHI notifikasi: identitas jadwal, judul,
 * isi (mata kuliah & ruang), serta waktu bunyi (hari, jam mulai, pengingat).
 * `endTime` sengaja tidak ikut karena tidak muncul di notifikasi.
 *
 * Dipakai untuk memutuskan "notifikasi ini masih sesuai atau perlu dibuat
 * ulang" tanpa menyimpan apa pun ke database.
 */
export function buildReminderFingerprint(schedule: ReminderSource): string {
  return [
    `v${FINGERPRINT_VERSION}`,
    schedule.id,
    schedule.courseName.trim(),
    schedule.dayOfWeek,
    schedule.startTime,
    schedule.room?.trim() ?? '',
    schedule.reminderMinutes,
  ].join('|');
}

/* ------------------------------------------------------------------------- */
/* Gerbang izin                                                               */
/* ------------------------------------------------------------------------- */

export type SyncGate = 'proceed' | 'unsupported' | 'permission-denied';

/**
 * Menentukan apakah sinkronisasi boleh berjalan, dari status izin/dukungan
 * platform. Dipisah sebagai fungsi murni supaya aturan "izin ditolak berarti
 * tidak ada penjadwalan, tetapi aplikasi tetap jalan" dapat diuji tanpa
 * perangkat.
 */
export function syncGateFor(permission: {
  supported: boolean;
  granted: boolean;
}): SyncGate {
  if (!permission.supported) {
    return 'unsupported';
  }
  if (!permission.granted) {
    return 'permission-denied';
  }
  return 'proceed';
}

/* ------------------------------------------------------------------------- */
/* Rencana pengingat                                                          */
/* ------------------------------------------------------------------------- */

export type PlannedReminder = {
  scheduleId: number;
  fingerprint: string;
  slot: ReminderSlot;
  title: string;
  body: string;
  /** Isi `content.data` — disimpan apa adanya di notifikasi native. */
  data: {
    type: typeof CLASS_REMINDER_TYPE;
    scheduleId: number;
    fingerprint: string;
  };
};

/** Mengubah daftar jadwal SQLite menjadi rencana notifikasi (satu per jadwal). */
export function planReminders(schedules: readonly ReminderSource[]): PlannedReminder[] {
  return schedules.map((schedule) => {
    const slot = reminderSlot(schedule.dayOfWeek, schedule.startTime, schedule.reminderMinutes);
    const content = buildReminderContent(schedule);
    const fingerprint = buildReminderFingerprint(schedule);

    return {
      scheduleId: schedule.id,
      fingerprint,
      slot,
      title: content.title,
      body: content.body,
      data: {
        type: CLASS_REMINDER_TYPE,
        scheduleId: schedule.id,
        fingerprint,
      },
    };
  });
}

/* ------------------------------------------------------------------------- */
/* Rekonsiliasi                                                               */
/* ------------------------------------------------------------------------- */

/** Ringkasan notifikasi yang sudah terjadwal di perangkat. */
export type ExistingReminder = {
  identifier: string;
  /** `null` bila metadata tidak lengkap (mis. notifikasi versi lama). */
  scheduleId: number | null;
  fingerprint: string | null;
};

export type ReconcilePlan = {
  /** Identifier yang harus dibatalkan (usang atau duplikat). */
  cancel: string[];
  /** Notifikasi yang belum ada dan harus dijadwalkan. */
  schedule: PlannedReminder[];
  /** Identifier yang sudah sesuai dan dibiarkan apa adanya. */
  keep: string[];
  /** Jumlah identifier yang dibatalkan karena duplikat. */
  duplicates: number;
};

/**
 * Membandingkan notifikasi yang ada di perangkat dengan rencana dari SQLite.
 *
 * Aturan:
 * - satu jadwal = tepat satu notifikasi;
 * - notifikasi dengan `scheduleId` yang sudah tidak ada di SQLite dibatalkan;
 * - fingerprint berbeda (mata kuliah/ruang/hari/jam/pengingat berubah)
 *   dibatalkan lalu dijadwalkan ulang;
 * - bila ada lebih dari satu notifikasi untuk jadwal yang sama, hanya yang
 *   pertama dipertahankan, sisanya dibatalkan (mencegah duplikat saat aplikasi
 *   dibuka berulang kali);
 * - fungsi ini murni: hasil untuk input yang sama selalu sama (idempoten).
 */
export function reconcileReminders(
  existing: readonly ExistingReminder[],
  planned: readonly PlannedReminder[]
): ReconcilePlan {
  const plannedById = new Map<number, PlannedReminder>();
  for (const reminder of planned) {
    plannedById.set(reminder.scheduleId, reminder);
  }

  const cancel: string[] = [];
  const keep: string[] = [];
  const keptSchedules = new Set<number>();
  let duplicates = 0;

  for (const current of existing) {
    const target = current.scheduleId === null ? undefined : plannedById.get(current.scheduleId);

    if (!target) {
      // Jadwal sudah dihapus, atau metadata tidak dikenali.
      cancel.push(current.identifier);
      continue;
    }

    if (current.fingerprint !== target.fingerprint) {
      // Konfigurasi berubah → buat ulang.
      cancel.push(current.identifier);
      continue;
    }

    if (keptSchedules.has(target.scheduleId)) {
      // Sudah ada satu notifikasi sah untuk jadwal ini.
      cancel.push(current.identifier);
      duplicates += 1;
      continue;
    }

    keptSchedules.add(target.scheduleId);
    keep.push(current.identifier);
  }

  const schedule = planned.filter((reminder) => !keptSchedules.has(reminder.scheduleId));

  return { cancel, schedule, keep, duplicates };
}
