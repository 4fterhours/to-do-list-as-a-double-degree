/**
 * lib/notificationSync.ts
 *
 * Rekonsiliasi notifikasi pengingat kelas dengan data SQLite.
 *
 * Alur satu arah: SQLite adalah sumber kebenaran, perangkat hanya cermin.
 * Setiap sinkronisasi membaca ulang seluruh jadwal lalu:
 * 1. menghitung rencana notifikasi (`planReminders`);
 * 2. membaca notifikasi milik aplikasi yang sudah terjadwal;
 * 3. membatalkan yang usang / duplikat, mempertahankan yang sesuai, dan
 *    menjadwalkan yang belum ada (`reconcileReminders`).
 *
 * Sifat: idempoten — memanggilnya berkali-kali menghasilkan keadaan yang sama
 * dan tidak pernah membuat notifikasi ganda. Tidak memakai
 * `cancelAllScheduledNotificationsAsync()`, jadi notifikasi fitur lain aman.
 *
 * Modul ini tidak menyentuh UI dan tidak menyimpan ID notifikasi ke database:
 * metadata `content.data` pada notifikasi itu sendiri sudah cukup untuk
 * mengenali dan merekonsiliasi.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { getAllSchedules } from '../db/schedules';
import type { Schedule } from '../db/types';
import {
  planReminders,
  reconcileReminders,
  syncGateFor,
  type ReminderSource,
} from './classReminders';
import {
  ensureClassReminderChannel,
  getReminderPermissionState,
  isNotificationPlatformSupported,
  PERMISSION_UNREADABLE_MESSAGE,
  requestReminderPermission,
} from './notifications';
import {
  cancelClassReminder,
  listScheduledClassReminders,
  scheduleClassReminder,
} from './notificationScheduler';

/**
 * Hasil satu putaran sinkronisasi. Empat keadaan gagal dibedakan karena
 * tindakan pengguna (dan pesan UI) berbeda untuk masing-masing:
 * `unsupported` & `module-unavailable` tidak bisa diperbaiki dari dalam
 * aplikasi, `permission-denied` diperbaiki lewat izin/Pengaturan, dan `error`
 * adalah kegagalan operasional penjadwalan yang layak dicoba ulang.
 */
export type ReminderSyncResult =
  /** Platform tanpa notifikasi lokal (web). */
  | { status: 'unsupported' }
  /** Platform didukung, tetapi build ini tidak memuat modul native. */
  | { status: 'module-unavailable' }
  /** Modul ada, izin notifikasi belum diberikan. */
  | { status: 'permission-denied' }
  /** Kegagalan operasional: baca izin, SQLite, atau penjadwalan. */
  | { status: 'error'; message: string }
  | {
      status: 'synced';
      scheduled: number;
      cancelled: number;
      kept: number;
      duplicatesRemoved: number;
      totalSchedules: number;
    };

/** `Schedule` (db/types) → `ReminderSource` (murni) agar lapisan uji bersih. */
export function toReminderSource(schedule: Schedule): ReminderSource {
  return {
    id: schedule.id,
    courseName: schedule.courseName,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime,
    room: schedule.room,
    reminderMinutes: schedule.reminderMinutes,
  };
}

/**
 * Menyelaraskan notifikasi dengan isi SQLite.
 *
 * Dipanggil setelah CRUD jadwal, saat aplikasi pertama kali siap (bila izin
 * sudah ada), dan saat aplikasi kembali aktif. Tidak pernah memunculkan dialog
 * izin — itu hanya lewat aksi eksplisit pengguna (`enableClassReminders`).
 *
 * Semua kegagalan ditangkap dan dikembalikan sebagai status, sehingga
 * kegagalan notifikasi tidak pernah menjatuhkan aplikasi.
 */
export async function syncClassReminders(db: SQLiteDatabase): Promise<ReminderSyncResult> {
  if (!isNotificationPlatformSupported()) {
    return { status: 'unsupported' };
  }

  try {
    const permission = await getReminderPermissionState();
    const gate = syncGateFor(permission);
    if (gate === 'unsupported') {
      return { status: 'unsupported' };
    }
    if (gate === 'module-unavailable') {
      return { status: 'module-unavailable' };
    }
    if (gate === 'error') {
      // Izin GAGAL DIBACA, bukan ditolak: pengguna tidak pernah melihat dialog
      // izinnya, sehingga melaporkan "permission-denied" akan menyuruh pengguna
      // membuka Pengaturan untuk masalah yang tidak ada di sana (F2-1).
      return { status: 'error', message: PERMISSION_UNREADABLE_MESSAGE };
    }
    if (gate === 'permission-denied') {
      return { status: 'permission-denied' };
    }

    // Channel dipastikan ada sebelum penjadwalan (khusus Android).
    //
    // Kegagalannya sengaja TIDAK menggagalkan sinkronisasi: pengingat tetap
    // dapat tampil karena lapisan native memakai channel cadangan
    // (IMPORTANCE_HIGH) saat channel `class-reminders` tidak ada. Yang diuji
    // sebagai syarat keputusan itu: channel tidak pernah membuat pengingat
    // dibatalkan, dilewati, atau diduplikasi — lihat
    // `tests/lib/notificationSync-channel.test.mjs` dan catatan F2A-1.
    await ensureClassReminderChannel();

    const schedules = await getAllSchedules(db);
    const planned = planReminders(schedules.map(toReminderSource));
    const existing = await listScheduledClassReminders();
    const plan = reconcileReminders(existing, planned);

    for (const identifier of plan.cancel) {
      await cancelClassReminder(identifier);
    }

    for (const reminder of plan.schedule) {
      await scheduleClassReminder(reminder);
    }

    return {
      status: 'synced',
      scheduled: plan.schedule.length,
      cancelled: plan.cancel.length,
      kept: plan.keep.length,
      duplicatesRemoved: plan.duplicates,
      totalSchedules: schedules.length,
    };
  } catch (error) {
    console.error('[notifikasi] Sinkronisasi pengingat gagal:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Kesalahan tidak diketahui.',
    };
  }
}

/**
 * Menjalankan sinkronisasi di latar belakang tanpa menunggu dan **tanpa pernah
 * melempar** (tidak ada unhandled promise rejection).
 *
 * Dipakai jalur yang tidak boleh menunggu notifikasi: setelah CRUD jadwal, saat
 * aplikasi siap, dan saat aplikasi kembali aktif. Semua kegagalan sudah
 * dilaporkan lewat nilai balik `syncClassReminders`, bukan exception; `.catch`
 * di bawah hanya jaring pengaman bila ada bug yang membuatnya melempar.
 *
 * Umpan balik ke pengguna tidak datang dari sini: layar Jadwal membaca status
 * pengingat saat kembali fokus (`hooks/useReminderStatus.ts`) dan menampilkan
 * keadaan sebenarnya, termasuk tombol coba lagi.
 */
export function requestReminderSync(db: SQLiteDatabase): void {
  void syncClassReminders(db)
    .then((result) => {
      if (result.status === 'error') {
        console.warn('[notifikasi] Sinkronisasi pengingat gagal:', result.message);
      }
    })
    .catch((error: unknown) => {
      console.error('[notifikasi] Sinkronisasi pengingat gagal tak terduga:', error);
    });
}

/**
 * Aksi pengguna "Aktifkan pengingat": buat channel → minta izin → sinkronkan.
 * Bila izin ditolak, jadwal tetap bisa dipakai; hasilnya hanya melaporkan
 * keadaan agar UI menjelaskan bahwa pengingat belum aktif.
 *
 * Modul native diperiksa lebih dulu supaya build lama tidak dilaporkan sebagai
 * "izin ditolak" — pengguna tidak akan pernah menemukan dialog izinnya.
 */
export async function enableClassReminders(db: SQLiteDatabase): Promise<ReminderSyncResult> {
  if (!isNotificationPlatformSupported()) {
    return { status: 'unsupported' };
  }

  const permission = await requestReminderPermission();

  // Gerbang yang sama dipakai di sini supaya kegagalan MEMBACA izin tidak
  // pernah dilaporkan sebagai "izin ditolak" pada jalur ini juga (F2-1).
  const gate = syncGateFor(permission);
  if (gate === 'unsupported') {
    return { status: 'unsupported' };
  }
  if (gate === 'module-unavailable') {
    return { status: 'module-unavailable' };
  }
  if (gate === 'error') {
    return { status: 'error', message: PERMISSION_UNREADABLE_MESSAGE };
  }
  if (gate === 'permission-denied') {
    return { status: 'permission-denied' };
  }

  return syncClassReminders(db);
}
