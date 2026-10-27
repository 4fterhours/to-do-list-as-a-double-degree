/**
 * lib/time.ts
 *
 * Seluruh perhitungan waktu layar Hari Ini. Fungsi murni, tanpa impor
 * React Native / SQLite, sehingga bisa diuji langsung di Node.
 *
 * Prinsip (brief 11): semua perhitungan memakai zona waktu LOKAL perangkat.
 * `new Date(y, m, d, h, min)` menghasilkan waktu lokal, bukan UTC. Tidak ada
 * asumsi zona waktu kampus.
 */

import { DEADLINE_SOON_MS } from '../db/schema';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

const WEEKDAY_NAMES = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

/* ------------------------------------------------------------------------- */
/* Jam                                                                        */
/* ------------------------------------------------------------------------- */

/** 'HH:mm' → menit sejak tengah malam. */
export function clockToMinutes(clock: string): number {
  const [hour, minute] = clock.split(':');
  return Number(hour) * 60 + Number(minute);
}

/** Menit sejak tengah malam → 'HH.mm' (gaya Indonesia, brief 11 memakai 11.40). */
export function minutesToClock(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}.${String(minute).padStart(2, '0')}`;
}

/** '10:00' → '10.00'. */
export function clockToDisplay(clock: string): string {
  return clock.replace(':', '.');
}

/** Rentang jam untuk ditampilkan: '10.00 – 11.40'. */
export function formatTimeRange(startClock: string, endClock: string): string {
  return `${clockToDisplay(startClock)} – ${clockToDisplay(endClock)}`;
}

/**
 * Teks untuk screen reader: waktu dibacakan sebagai jam, bukan deretan simbol
 * (brief 09). '10:00' → 'pukul 10.00'.
 */
export function toSpokenTime(clock: string): string {
  return `pukul ${clockToDisplay(clock)}`;
}

/* ------------------------------------------------------------------------- */
/* Tanggal lokal                                                              */
/* ------------------------------------------------------------------------- */

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Kunci tanggal lokal 'YYYY-MM-DD'; dipakai untuk mendeteksi pergantian hari. */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Indeks hari yang bebas pergeseran DST: selisih dua indeks = selisih jumlah
 * hari kalender, bukan hasil bagi 86.400.000 ms yang bisa meleset.
 */
function dayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** Selisih hari kalender lokal: 0 = hari ini, -1 = kemarin, 1 = besok. */
export function dayOffset(target: Date, reference: Date): number {
  return dayIndex(target) - dayIndex(reference);
}

/** 'Senin, 26 Oktober 2026' */
export function formatLongDate(date: Date): string {
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const month = MONTH_NAMES[date.getMonth()];
  return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
}

/** '28 Oktober' */
function formatDateWithoutYear(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

/**
 * Menggabungkan tanggal lokal dengan jam 'HH:mm' menjadi Date lokal.
 * Dipakai untuk mengetahui kapan kelas mulai/selesai HARI INI.
 */
export function combineLocalDate(date: Date, clock: string): Date {
  const [hour, minute] = clock.split(':');
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(hour),
    Number(minute),
    0,
    0
  );
}

/**
 * Format tanggal deadline (brief 10 memakai bentuk relatif seperti
 * "Kemarin, 23.59"). Hari ini/kemarin/besok memakai kata relatif; selain itu
 * tanggal absolut, ditambah tahun bila berbeda tahun.
 */
export function formatDeadlineDate(deadlineAt: number, now: Date): string {
  const deadline = new Date(deadlineAt);
  const clock = minutesToClock(deadline.getHours() * 60 + deadline.getMinutes());
  const offset = dayOffset(deadline, now);

  const relative =
    offset === 0 ? 'Hari ini' : offset === -1 ? 'Kemarin' : offset === 1 ? 'Besok' : null;

  if (relative) {
    return `${relative}, ${clock}`;
  }

  const date =
    deadline.getFullYear() === now.getFullYear()
      ? formatDateWithoutYear(deadline)
      : `${formatDateWithoutYear(deadline)} ${deadline.getFullYear()}`;

  return `${date}, ${clock}`;
}

/** Versi untuk screen reader: 'hari ini pukul 23.59'. */
export function toSpokenDeadline(deadlineAt: number, now: Date): string {
  const deadline = new Date(deadlineAt);
  const clock = minutesToClock(deadline.getHours() * 60 + deadline.getMinutes());
  const offset = dayOffset(deadline, now);

  if (offset === 0) return `hari ini pukul ${clock}`;
  if (offset === -1) return `kemarin pukul ${clock}`;
  if (offset === 1) return `besok pukul ${clock}`;
  return `${formatDateWithoutYear(deadline)} pukul ${clock}`;
}

/* ------------------------------------------------------------------------- */
/* Durasi                                                                     */
/* ------------------------------------------------------------------------- */

/** Pembulatan ke ATAS per menit (brief 11). */
export function ceilMinutes(ms: number): number {
  return Math.ceil(ms / MINUTE_MS);
}

/** 40 → '40 menit'; 80 → '1 jam 20 menit'; 120 → '2 jam'. */
export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return 'kurang dari 1 menit';
  }
  if (minutes < 60) {
    return `${minutes} menit`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} jam` : `${hours} jam ${rest} menit`;
}

/* ------------------------------------------------------------------------- */
/* Status kelas hari ini                                                      */
/* ------------------------------------------------------------------------- */

export type ClassStatus = 'ended' | 'ongoing' | 'upcoming';

export type ClassTiming = {
  status: ClassStatus;
  startAt: Date;
  endAt: Date;
};

/** Menentukan posisi satu jadwal terhadap `now`, memakai jam lokal hari ini. */
export function getClassTiming(
  schedule: { startTime: string; endTime: string },
  now: Date
): ClassTiming {
  const startAt = combineLocalDate(now, schedule.startTime);
  const endAt = combineLocalDate(now, schedule.endTime);

  let status: ClassStatus;
  if (now.getTime() >= endAt.getTime()) {
    status = 'ended';
  } else if (now.getTime() >= startAt.getTime()) {
    status = 'ongoing';
  } else {
    status = 'upcoming';
  }

  return { status, startAt, endAt };
}

/** Kelas yang sedang berlangsung atau belum mulai, urut jam mulai. */
export function getRemainingClasses<T extends { startTime: string; endTime: string }>(
  schedules: readonly T[],
  now: Date
): T[] {
  return schedules.filter((schedule) => getClassTiming(schedule, now).status !== 'ended');
}

/* ------------------------------------------------------------------------- */
/* Urgensi deadline                                                           */
/* ------------------------------------------------------------------------- */

export type DeadlineTone = 'overdue' | 'deadline' | 'info';

export type DeadlineState = {
  tone: DeadlineTone;
  /** Label untuk badge, mis. 'Terlambat 9 jam' / 'Sisa 14 jam' / 'Sisa 2 hari'. */
  label: string;
};

/**
 * Brief 11: lewat deadline → merah (overdue); ≤ 24 jam → amber (deadline);
 * > 24 jam → info. Setiap keadaan punya label teks, jadi status tidak
 * bergantung pada warna saja (brief 09).
 */
export function getDeadlineState(deadlineAt: number, now: Date): DeadlineState {
  const diff = deadlineAt - now.getTime();

  if (diff < 0) {
    const late = -diff;
    if (late >= HOUR_MS) {
      return { tone: 'overdue', label: `Terlambat ${Math.floor(late / HOUR_MS)} jam` };
    }
    if (late >= MINUTE_MS) {
      return { tone: 'overdue', label: `Terlambat ${Math.floor(late / MINUTE_MS)} menit` };
    }
    return { tone: 'overdue', label: 'Baru saja lewat' };
  }

  // Label sisa waktu memakai pembulatan ke BAWAH agar tidak menjanjikan waktu
  // lebih panjang daripada kenyataan. Arah ini konsisten dengan contoh brief
  // "Terlambat 9 jam" untuk keterlambatan 9,35 jam.
  if (diff <= DEADLINE_SOON_MS) {
    if (diff < HOUR_MS) {
      return { tone: 'deadline', label: `Sisa ${Math.max(1, ceilMinutes(diff))} menit` };
    }
    return { tone: 'deadline', label: `Sisa ${Math.max(1, Math.floor(diff / HOUR_MS))} jam` };
  }

  return { tone: 'info', label: `Sisa ${Math.max(1, Math.floor(diff / DAY_MS))} hari` };
}
