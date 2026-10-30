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
  requestReminderPermission,
} from './notifications';
import {
  cancelClassReminder,
  listScheduledClassReminders,
  scheduleClassReminder,
} from './notificationScheduler';

export type ReminderSyncResult =
  | { status: 'unsupported' }
  | { status: 'permission-denied' }
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
    if (gate === 'permission-denied') {
      return { status: 'permission-denied' };
    }

    // Channel dipastikan ada sebelum penjadwalan (khusus Android).
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
 * Aksi pengguna "Aktifkan pengingat": buat channel → minta izin → sinkronkan.
 * Bila izin ditolak, jadwal tetap bisa dipakai; hasilnya hanya melaporkan
 * keadaan agar UI menjelaskan bahwa pengingat belum aktif.
 */
export async function enableClassReminders(db: SQLiteDatabase): Promise<ReminderSyncResult> {
  if (!isNotificationPlatformSupported()) {
    return { status: 'unsupported' };
  }

  const permission = await requestReminderPermission();
  if (!permission.granted) {
    return { status: 'permission-denied' };
  }

  return syncClassReminders(db);
}
