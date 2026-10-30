/**
 * lib/notificationScheduler.ts
 *
 * Menjembatani rencana pengingat (`lib/classReminders.ts`) dengan
 * `expo-notifications`: menjadwalkan, membaca, dan membatalkan notifikasi.
 *
 * Semua perhitungan waktu sudah selesai sebelum masuk ke sini; modul ini hanya
 * menerjemahkan slot (hari/jam/menit lokal) menjadi trigger platform.
 *
 * Perbedaan platform:
 * - Android: trigger `WEEKLY` (weekday 1 = Minggu … 7 = Sabtu) dengan
 *   `channelId` dan `delivery: 'bestEffort'` (bawaan paket). Tidak memakai
 *   alarm exact karena aplikasi tidak membutuhkan ketepatan detik.
 * - iOS: trigger `CALENDAR` berulang (`repeats: true`) dengan komponen
 *   `weekday`/`hour`/`minute`; konvensi weekday sama (1 = Minggu), sehingga
 *   perilakunya setara dengan Android.
 *
 * Tidak ada push token, FCM, atau koneksi jaringan di modul ini.
 */

import type { NotificationTriggerInput } from 'expo-notifications';
import { Platform } from 'react-native';

import {
  CLASS_REMINDER_CHANNEL_ID,
  CLASS_REMINDER_TYPE,
  type ExistingReminder,
  type PlannedReminder,
} from './classReminders';
import { getNotifications } from './notifications';

/** Membaca weekday & jam dari metadata notifikasi yang sudah terjadwal. */
function readExisting(data: Record<string, unknown> | null | undefined): {
  type: string | null;
  scheduleId: number | null;
  fingerprint: string | null;
} {
  if (!data) {
    return { type: null, scheduleId: null, fingerprint: null };
  }

  const rawScheduleId = data.scheduleId;
  const scheduleId =
    typeof rawScheduleId === 'number'
      ? rawScheduleId
      : typeof rawScheduleId === 'string' && /^\d+$/.test(rawScheduleId)
        ? Number(rawScheduleId)
        : null;

  return {
    type: typeof data.type === 'string' ? data.type : null,
    scheduleId,
    fingerprint: typeof data.fingerprint === 'string' ? data.fingerprint : null,
  };
}

/**
 * Notifikasi terjadwal milik aplikasi ini saja.
 *
 * Hanya entri dengan `data.type === 'class-reminder'` yang dikembalikan,
 * sehingga notifikasi lain (mis. fitur pengingat tugas di masa depan) tidak
 * pernah tersentuh oleh rekonsiliasi ini.
 */
export async function listScheduledClassReminders(): Promise<ExistingReminder[]> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return [];
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  return scheduled
    .map((request) => {
      const meta = readExisting(request.content.data as Record<string, unknown> | null);
      return { identifier: request.identifier, meta };
    })
    .filter((entry) => entry.meta.type === CLASS_REMINDER_TYPE)
    .map((entry) => ({
      identifier: entry.identifier,
      scheduleId: entry.meta.scheduleId,
      fingerprint: entry.meta.fingerprint,
    }));
}

/** Membatalkan satu notifikasi berdasarkan identifier. */
export async function cancelClassReminder(identifier: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Menjadwalkan satu pengingat kelas berulang mingguan.
 * Mengembalikan identifier dari sistem, atau `null` bila platform tidak
 * mendukung (web).
 */
export async function scheduleClassReminder(
  reminder: PlannedReminder
): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return null;
  }

  const { weekday, hour, minute } = reminder.slot;

  const trigger: NotificationTriggerInput =
    Platform.OS === 'android'
      ? {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: CLASS_REMINDER_CHANNEL_ID,
          // Bawaan paket & OS: pengiriman best-effort, bukan alarm exact.
          delivery: 'bestEffort',
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday,
          hour,
          minute,
          repeats: true,
        };

  return Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.body,
      // Metadata dipakai rekonsiliasi berikutnya; tidak ada data pribadi lain.
      data: { ...reminder.data },
      sound: true,
    },
    trigger,
  });
}
