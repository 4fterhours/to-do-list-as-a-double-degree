/**
 * lib/notifications.ts
 *
 * Lapisan tipis di atas `expo-notifications` untuk hal-hal yang bersifat
 * platform: channel Android, izin notifikasi, dan cara notifikasi ditampilkan
 * saat aplikasi sedang terbuka.
 *
 * Tidak ada perhitungan jadwal di sini (lihat `lib/classReminders.ts`) dan
 * tidak ada akses SQLite (lihat `lib/notificationSync.ts`).
 *
 * Catatan platform:
 * - Web tidak mendukung notifikasi terjadwal di paket ini. Semua fungsi di
 *   sini melakukan no-op di web agar preview web tidak error; UI menampilkan
 *   status "tidak didukung".
 * - `expo-notifications` hanya diimpor saat runtime native (bukan di web) dan
 *   tidak ada push token, FCM, atau server: seluruh alur 100% lokal.
 */

import { Platform } from 'react-native';

import { CLASS_REMINDER_CHANNEL_ID } from './classReminders';

const CHANNEL_NAME = 'Pengingat Kuliah';

const CHANNEL_DESCRIPTION =
  'Pemberitahuan beberapa menit sebelum kelas mingguan dimulai, sesuai menit pengingat pada jadwal.';

/** True bila platform ini punya penjadwalan notifikasi lokal. */
export function isNotificationPlatformSupported(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

/* ------------------------------------------------------------------------- */
/* Akses modul native                                                        */
/* ------------------------------------------------------------------------- */

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null = null;

/**
 * Penanda bahwa `require('expo-notifications')` pernah gagal. Disimpan agar
 * percobaan berikutnya tidak memicu `console.warn` berulang setiap layar
 * dibuka. Kegagalan ini normal bila build yang terpasang belum memuat modul
 * native tersebut (mis. development build lama).
 */
let moduleLoadFailed = false;

/**
 * Memuat `expo-notifications` hanya ketika benar-benar dibutuhkan.
 *
 * Pemanggilan lazy dipakai agar bundel web tidak menjalankan modul native dan
 * agar kegagalan satu platform tidak menjatuhkan aplikasi saat modul diimpor.
 *
 * `null` di sini berarti dua hal yang berbeda dan HARUS dibedakan pemanggil:
 * platform tidak mendukung notifikasi (web), atau modul native tidak ada di
 * build yang terpasang. Gunakan `getNotificationModuleState()` untuk itu.
 */
export function getNotifications(): NotificationsModule | null {
  if (!isNotificationPlatformSupported()) {
    return null;
  }
  if (moduleLoadFailed) {
    return null;
  }
  if (cached === null) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('expo-notifications') as NotificationsModule;
    } catch (error) {
      moduleLoadFailed = true;
      console.warn('[notifikasi] Modul expo-notifications tidak tersedia di build ini:', error);
      return null;
    }
  }
  return cached;
}

/**
 * Tiga keadaan yang berbeda dan tidak boleh disamakan:
 * - `unsupported`  → platform ini memang tidak punya notifikasi lokal (web);
 * - `unavailable`  → platform didukung, tetapi build yang terpasang tidak
 *                    memuat modul native `expo-notifications`;
 * - `ready`        → modul native berhasil dimuat.
 */
export type NotificationModuleState = 'unsupported' | 'unavailable' | 'ready';

export function getNotificationModuleState(): NotificationModuleState {
  if (!isNotificationPlatformSupported()) {
    return 'unsupported';
  }
  return getNotifications() ? 'ready' : 'unavailable';
}

/* ------------------------------------------------------------------------- */
/* Channel Android                                                           */
/* ------------------------------------------------------------------------- */

/**
 * Membuat channel `class-reminders` bila belum ada.
 *
 * Urutannya penting: di Android 13+ channel harus ada SEBELUM izin diminta,
 * karena sistem menampilkan dialog izin berdasarkan channel yang terdaftar.
 * Di iOS fungsi ini tidak melakukan apa pun (channel hanya konsep Android).
 *
 * Importance DEFAULT sesuai permintaan: cukup menampilkan notifikasi dengan
 * bunyi bawaan, tanpa menembus mode senyap atau Do Not Disturb.
 *
 * **Nilai balik.** `true` = channel ada/terbarui. `false` = tidak berlaku
 * (bukan Android, modul tidak termuat) ATAU pembuatan gagal; kegagalan sudah
 * dicatat sebagai peringatan. Pemanggil tidak boleh memperlakukan `false`
 * sebagai "pengingat tidak akan tampil": expo-notifications menyusun
 * notifikasi lewat `BaseNotificationBuilder`, dan bila channel yang diminta
 * tidak ada, builder itu memakai channel cadangan
 * `expo_notifications_fallback_notification_channel` (dibuat saat itu juga,
 * IMPORTANCE_HIGH). Lihat audit Fase 2A di
 * `tests/lib/notificationSync-channel.test.mjs`.
 */
export async function ensureClassReminderChannel(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const Notifications = getNotifications();
  if (!Notifications) {
    return false;
  }

  try {
    await Notifications.setNotificationChannelAsync(CLASS_REMINDER_CHANNEL_ID, {
      name: CHANNEL_NAME,
      description: CHANNEL_DESCRIPTION,
      importance: Notifications.AndroidImportance.DEFAULT,
      // Getaran & bunyi bawaan sistem; tidak ada custom sound (PRD: tanpa dekorasi).
      enableVibrate: true,
    });
    return true;
  } catch (error) {
    console.warn('[notifikasi] Gagal membuat channel pengingat:', error);
    return false;
  }
}

/* ------------------------------------------------------------------------- */
/* Izin                                                                      */
/* ------------------------------------------------------------------------- */

/**
 * Pesan tunggal untuk "izin gagal dibaca". Dipakai lapisan sinkronisasi
 * (`lib/notificationSync.ts`) dan hook status UI (`hooks/useReminderStatus.ts`)
 * supaya kedua jalur menampilkan kalimat yang sama, bukan dua salinan yang bisa
 * menyimpang.
 */
export const PERMISSION_UNREADABLE_MESSAGE = 'Status izin notifikasi tidak dapat dibaca.';

export type ReminderPermissionState = {
  /** Platform ini punya notifikasi lokal sama sekali. */
  supported: boolean;
  /**
   * Modul native `expo-notifications` benar-benar termuat di build ini.
   * `false` berarti build yang terpasang tidak memuat fitur notifikasi —
   * berbeda dari `supported: false` yang berarti platformnya memang tidak
   * mendukung (web).
   */
  moduleAvailable: boolean;
  /** Izin diberikan dan notifikasi bisa muncul. */
  granted: boolean;
  /** Izin masih bisa diminta lewat dialog (false = harus lewat Pengaturan). */
  canAskAgain: boolean;
  /** Status mentah untuk ditampilkan/log, mis. 'undetermined', 'denied'. */
  status: string;
};

/** Platform tanpa notifikasi lokal sama sekali (web). */
const UNSUPPORTED: ReminderPermissionState = {
  supported: false,
  moduleAvailable: false,
  granted: false,
  canAskAgain: false,
  status: 'unsupported',
};

/**
 * Platform didukung, tetapi modul native tidak ada di build. Bukan penolakan
 * izin: pengguna tidak bisa memperbaikinya dari dialog izin, dan pengingat
 * tidak boleh dilaporkan aktif.
 */
const MODULE_UNAVAILABLE: ReminderPermissionState = {
  supported: true,
  moduleAvailable: false,
  granted: false,
  canAskAgain: false,
  status: 'module-unavailable',
};

/** Menerjemahkan "modul tidak termuat" ke keadaan yang benar. */
function unavailableState(): ReminderPermissionState {
  return isNotificationPlatformSupported() ? MODULE_UNAVAILABLE : UNSUPPORTED;
}

/**
 * Membaca status izin tanpa memunculkan dialog.
 *
 * Android 10 (API 29) tidak punya runtime permission notifikasi: status yang
 * dilaporkan sistem selalu "granted" selama notifikasi aplikasi tidak dimatikan
 * pengguna. Android 13+ memakai izin runtime `POST_NOTIFICATIONS`.
 */
export async function getReminderPermissionState(): Promise<ReminderPermissionState> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return unavailableState();
  }

  try {
    const permissions = await Notifications.getPermissionsAsync();
    return {
      supported: true,
      moduleAvailable: true,
      granted: permissions.granted,
      canAskAgain: permissions.canAskAgain,
      status: permissions.status,
    };
  } catch (error) {
    // Modul ada tetapi pembacaan izin gagal: tetap "tersedia", izin tidak
    // diketahui, sehingga pemanggil tidak boleh menganggap pengingat aktif.
    console.warn('[notifikasi] Gagal membaca izin notifikasi:', error);
    return {
      supported: true,
      moduleAvailable: true,
      granted: false,
      canAskAgain: false,
      status: 'error',
    };
  }
}

/**
 * Meminta izin notifikasi. Channel dibuat lebih dulu di Android.
 * Dipanggil HANYA dari aksi eksplisit pengguna ("Aktifkan pengingat"), bukan
 * otomatis setiap aplikasi dibuka.
 */
export async function requestReminderPermission(): Promise<ReminderPermissionState> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return unavailableState();
  }

  await ensureClassReminderChannel();

  try {
    const permissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: false,
      },
    });
    return {
      supported: true,
      moduleAvailable: true,
      granted: permissions.granted,
      canAskAgain: permissions.canAskAgain,
      status: permissions.status,
    };
  } catch (error) {
    console.warn('[notifikasi] Gagal meminta izin notifikasi:', error);
    return {
      supported: true,
      moduleAvailable: true,
      granted: false,
      canAskAgain: false,
      status: 'error',
    };
  }
}

/* ------------------------------------------------------------------------- */
/* Tampilan saat aplikasi terbuka                                            */
/* ------------------------------------------------------------------------- */

let handlerConfigured = false;

/**
 * Mengatur bagaimana notifikasi ditampilkan ketika aplikasi sedang di depan.
 * Tanpa ini, notifikasi yang jatuh tempo saat aplikasi terbuka tidak tampil.
 *
 * Dipanggil sekali dari root layout; aman dipanggil berulang karena dijaga
 * flag. Tidak memengaruhi notifikasi yang datang saat aplikasi di latar
 * belakang (itu ditangani sistem).
 */
export function configureNotificationHandler(): void {
  const Notifications = getNotifications();
  if (!Notifications || handlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  handlerConfigured = true;
}
