/**
 * tests/support/native/expo-notifications.mjs
 *
 * Tiruan modul native `expo-notifications`. Ini satu-satunya bagian native yang
 * dipalsukan; `lib/notifications.ts`, `lib/notificationScheduler.ts`, dan
 * `lib/notificationSync.ts` yang diuji tetap kode produksi asli.
 *
 * Isi:
 * - penyimpanan notifikasi terjadwal di memori (bukan di perangkat);
 * - keadaan izin yang dapat diatur (granted / denied / blocked / gagal dibaca);
 * - `faults` untuk menyuntikkan kegagalan pada titik yang tepat, dipakai
 *   khusus oleh pengujian K12 (sinkronisasi tidak atomik).
 *
 * `state.installed = false` membuat `require('expo-notifications')` melempar,
 * yaitu meniru build lama yang tidak memuat modul native (temuan D6).
 */

export const state = {
  /** Apakah modul native termuat di build yang "terpasang". */
  installed: true,
  permission: { granted: true, canAskAgain: true, status: 'granted' },
  channels: [],
  /** identifier → { content, trigger } */
  scheduled: new Map(),
  calls: {
    channel: 0,
    permissionRead: 0,
    permissionRequest: 0,
    schedule: 0,
    cancel: 0,
    list: 0,
    cancelAll: 0,
    handler: 0,
  },
  /**
   * Pesan kegagalan per operasi, atau `null`. Nilai selain `null` membuat
   * operasi tersebut melempar error.
   */
  faults: {
    channel: null,
    permissionRead: null,
    permissionRequest: null,
    list: null,
    cancel: null,
    schedule: null,
  },
  sequence: 0,
  /** Urutan pemanggilan native, untuk menguji urutan (mis. channel sebelum izin). */
  order: [],
  /**
   * Kegagalan yang baru terjadi SETELAH n pemanggilan berhasil.
   * Dipakai pengujian K12 untuk mensimulasikan kegagalan di tengah loop
   * (mis. dua pembatalan, satu berhasil lalu yang kedua gagal).
   */
  faultsAfter: {},
};

export function reset() {
  state.installed = true;
  state.permission = { granted: true, canAskAgain: true, status: 'granted' };
  state.channels = [];
  state.scheduled = new Map();
  for (const key of Object.keys(state.calls)) state.calls[key] = 0;
  for (const key of Object.keys(state.faults)) state.faults[key] = null;
  state.sequence = 0;
  state.order = [];
  state.faultsAfter = {};
}

/** Menyalakan kegagalan pada satu operasi native. */
export function fault(operation, message = `kegagalan native: ${operation}`) {
  if (!(operation in state.faults)) {
    throw new Error(`operasi fault tidak dikenal: ${operation}`);
  }
  state.faults[operation] = message;
}

export function clearFaults() {
  for (const key of Object.keys(state.faults)) state.faults[key] = null;
  state.faultsAfter = {};
}

/**
 * Kegagalan yang baru terjadi setelah `remaining` pemanggilan berhasil.
 * Contoh: `faultAfter('cancel', 1)` → pembatalan pertama sukses, kedua gagal.
 */
export function faultAfter(operation, remaining, message = `kegagalan native setelah ${remaining} operasi: ${operation}`) {
  if (!(operation in state.faults)) {
    throw new Error(`operasi fault tidak dikenal: ${operation}`);
  }
  state.faultsAfter[operation] = { remaining, message };
}

/** Ringkasan notifikasi terjadwal: identifier + scheduleId + fingerprint. */
export function scheduledReminders() {
  return [...state.scheduled.entries()].map(([identifier, entry]) => ({
    identifier,
    scheduleId: entry.content?.data?.scheduleId ?? null,
    fingerprint: entry.content?.data?.fingerprint ?? null,
  }));
}

/** Menambah notifikasi "yatim"/duplikat langsung, meniru sisa instalasi lama. */
export function injectScheduled(identifier, data, content = {}) {
  state.scheduled.set(identifier, {
    content: { ...content, data },
    trigger: { type: 'weekly' },
  });
}

function assertNoFault(operation) {
  state.order.push(operation);

  const message = state.faults[operation];
  if (message) throw new Error(message);

  const delayed = state.faultsAfter[operation];
  if (delayed) {
    if (delayed.remaining <= 0) throw new Error(delayed.message);
    delayed.remaining -= 1;
  }
}

const mockModule = {
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly', CALENDAR: 'calendar', TIME_INTERVAL: 'timeInterval' },

  async setNotificationChannelAsync(identifier, options) {
    state.calls.channel += 1;
    assertNoFault('channel');
    state.channels = state.channels.filter((channel) => channel.identifier !== identifier);
    state.channels.push({ identifier, options });
  },

  async getPermissionsAsync() {
    state.calls.permissionRead += 1;
    assertNoFault('permissionRead');
    return { ...state.permission };
  },

  async requestPermissionsAsync(options) {
    state.calls.permissionRequest += 1;
    state.lastRequestOptions = options;
    assertNoFault('permissionRequest');
    return { ...state.permission };
  },

  setNotificationHandler(handler) {
    state.calls.handler += 1;
    state.handler = handler;
  },

  async getAllScheduledNotificationsAsync() {
    state.calls.list += 1;
    assertNoFault('list');
    return [...state.scheduled.entries()].map(([identifier, entry]) => ({
      identifier,
      content: entry.content,
      trigger: entry.trigger,
    }));
  },

  async scheduleNotificationAsync({ content, trigger }) {
    state.calls.schedule += 1;
    assertNoFault('schedule');
    state.sequence += 1;
    const identifier = `native-${state.sequence}`;
    state.scheduled.set(identifier, { content, trigger });
    return identifier;
  },

  async cancelScheduledNotificationAsync(identifier) {
    state.calls.cancel += 1;
    assertNoFault('cancel');
    state.scheduled.delete(identifier);
  },

  async cancelAllScheduledNotificationsAsync() {
    state.calls.cancelAll += 1;
    state.scheduled.clear();
  },
};

/** Nilai yang dikembalikan `require('expo-notifications')` di kode produksi. */
export const mock = mockModule;
