/**
 * tests/lib/notificationSync-permission.test.mjs
 *
 * Domain: KLASIFIKASI IZIN NOTIFIKASI (D6) — regresi F2-1.
 *
 * Temuan Fase 2: `syncClassReminders` melaporkan `permission-denied` ketika
 * pembacaan izin GAGAL. Dua keadaan itu berbeda artinya:
 *
 *   permission-denied → pengguna memang belum memberi izin; perbaikannya lewat
 *                       dialog izin atau Pengaturan sistem.
 *   error             → status izin tidak bisa dibaca karena kegagalan
 *                       operasional; pengguna tidak pernah melihat dialognya,
 *                       jadi menyuruhnya membuka Pengaturan adalah salah.
 *
 * Berkas ini sengaja terpisah dari `notificationSync.test.mjs` supaya
 * pembedaannya terlihat sebagai satu kelompok uji tersendiri.
 *
 * Yang dipalsukan hanya `expo-notifications` dan `Platform`; rantai
 * `lib/notificationSync.ts` → `lib/notifications.ts` → `lib/notificationScheduler.ts`
 * → `db/schedules.ts` → SQLite nyata tetap kode produksi.
 */

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createSchedule } from '../../db/schedules.ts';
import { PERMISSION_UNREADABLE_MESSAGE } from '../../lib/notifications.ts';
import {
  enableClassReminders,
  requestReminderSync,
  syncClassReminders,
} from '../../lib/notificationSync.ts';
import {
  clearFaults,
  fault,
  reset as resetNative,
  state as nativeState,
} from '../support/native/expo-notifications.mjs';
import { setPlatform } from '../support/native/react-native.mjs';
import {
  clearContentTables,
  createTempDir,
  openInitializedDatabase,
} from '../support/db-fixtures.mjs';

const scheduleInput = (overrides = {}) => ({
  courseName: 'Hukum Dagang',
  dayOfWeek: 1,
  startTime: '10:00',
  endTime: '11:40',
  room: 'B-204',
  reminderMinutes: 15,
  ...overrides,
});

let database;

const setup = async (t) => {
  resetNative();
  setPlatform('android');
  const db = await openInitializedDatabase(createTempDir(t));
  await clearContentTables(db);
  return db;
};

const closeDatabase = () => {
  database?.close();
  database = undefined;
};

/** Memberi kesempatan promise latar belakang selesai. */
const flush = async () => {
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

/** Tidak ada satu pun operasi yang menyentuh perangkat. */
const assertDeviceUntouched = () => {
  assert.equal(nativeState.calls.schedule, 0, 'tidak boleh ada penjadwalan');
  assert.equal(nativeState.calls.cancel, 0, 'tidak boleh ada pembatalan');
  assert.equal(nativeState.scheduled.size, 0, 'perangkat harus tetap kosong');
  assert.equal(nativeState.calls.cancelAll, 0, 'cancelAll tidak pernah dipakai');
};

describe('IZIN — pembacaan gagal dibedakan dari penolakan nyata (F2-1)', () => {
  afterEach(closeDatabase);

  test('izin GAGAL DIBACA → status error dengan pesan yang jelas', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    fault('permissionRead', 'layanan izin tidak merespons');

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'error', 'bukan permission-denied');
    assert.equal(result.message, PERMISSION_UNREADABLE_MESSAGE);
    assertDeviceUntouched();
  });

  test('izin benar-benar DITOLAK → tetap permission-denied, bukan error', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    nativeState.permission = { granted: false, canAskAgain: true, status: 'denied' };

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'permission-denied');
    assert.equal('message' in result, false, 'penolakan izin bukan kegagalan operasional');
    assertDeviceUntouched();
  });

  test('izin ditolak permanen → permission-denied, bukan error', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    nativeState.permission = { granted: false, canAskAgain: false, status: 'denied' };

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'permission-denied');
    assertDeviceUntouched();
  });

  test('izin belum pernah ditanyakan (undetermined) → permission-denied', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    nativeState.permission = { granted: false, canAskAgain: true, status: 'undetermined' };

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'permission-denied');
    assertDeviceUntouched();
  });

  test('izin diberikan → tidak pernah salah dilaporkan sebagai error', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    nativeState.permission = { granted: true, canAskAgain: false, status: 'granted' };

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(nativeState.scheduled.size, 1);
  });

  test('kegagalan baca izin tidak menghapus pengingat yang sudah benar', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());

    // Sinkronisasi pertama berhasil: satu pengingat sudah terjadwal.
    await syncClassReminders(database);
    assert.equal(nativeState.scheduled.size, 1);

    // Pembacaan izin gagal SETELAH pengingat ada: tidak boleh ada yang hilang.
    fault('permissionRead', 'izin tidak terbaca');
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'error');
    assert.equal(nativeState.scheduled.size, 1, 'pengingat lama tetap aman');
    assert.equal(nativeState.calls.cancel, 0);
  });

  test('izin gagal dibaca lalu pulih → sinkronisasi berikutnya melaporkan synced', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    fault('permissionRead', 'sesaat tidak terbaca');

    assert.equal((await syncClassReminders(database)).status, 'error');

    clearFaults();
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(nativeState.scheduled.size, 1);
  });
});

describe('IZIN — jalur aksi pengguna "Aktifkan pengingat"', () => {
  afterEach(closeDatabase);

  test('permintaan izin GAGAL → error, bukan permission-denied', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    fault('permissionRequest', 'dialog izin gagal dibuka');

    const result = await enableClassReminders(database);

    assert.equal(result.status, 'error');
    assert.equal(result.message, PERMISSION_UNREADABLE_MESSAGE);
    assert.equal(nativeState.calls.schedule, 0);
  });

  test('permintaan izin ditolak pengguna → permission-denied, bukan error', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    nativeState.permission = { granted: false, canAskAgain: false, status: 'denied' };

    const result = await enableClassReminders(database);

    assert.equal(result.status, 'permission-denied');
    assert.equal(nativeState.calls.schedule, 0);
  });

  test('izin diberikan → channel dibuat lalu pengingat dijadwalkan', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());

    const result = await enableClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(nativeState.scheduled.size, 1);
    assert.ok(nativeState.order.indexOf('channel') < nativeState.order.indexOf('permissionRequest'));
  });
});

describe('IZIN — pemanggilan latar belakang tetap tanpa unhandled rejection', () => {
  afterEach(closeDatabase);

  test('requestReminderSync saat izin gagal dibaca tidak melempar', async (t) => {
    const rejections = [];
    const listener = (reason) => rejections.push(String(reason));
    process.on('unhandledRejection', listener);
    t.after(() => process.off('unhandledRejection', listener));

    database = await setup(t);
    await createSchedule(database, scheduleInput());
    fault('permissionRead', 'izin tidak terbaca');

    requestReminderSync(database);
    await flush();

    assert.deepEqual(rejections, [], 'tidak boleh ada unhandled rejection');
    assert.equal(nativeState.scheduled.size, 0);

    clearFaults();
    requestReminderSync(database);
    await flush();
    assert.equal(nativeState.scheduled.size, 1, 'pemanggilan berikutnya pulih');
  });
});
