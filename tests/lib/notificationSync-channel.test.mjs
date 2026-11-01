/**
 * tests/lib/notificationSync-channel.test.mjs
 *
 * Domain: CHANNEL NOTIFIKASI ANDROID — audit Fase 2A.
 *
 * Pertanyaan yang dijawab berkas ini: kalau `setNotificationChannelAsync` gagal,
 * apakah pengingat kelas masih benar-benar tampil? Kalau tidak, sinkronisasi
 * wajib melaporkan `error`, bukan `synced`.
 *
 * Jawaban (berdasarkan kode native expo-notifications 58.1.6 di `node_modules`,
 * bukan asumsi):
 *
 *   1. `lib/notificationScheduler.ts` selalu mengirim `channelId:
 *      'class-reminders'` pada trigger — kegagalan pembuatan channel tidak
 *      mengubah rencana penjadwalan dan tidak menghapus satu pengingat pun.
 *   2. Saat alarm berbunyi, notifikasi dibangun oleh
 *      `BaseNotificationBuilder` (`android/.../presentation/builders/
 *      BaseNotificationBuilder.kt`). Getter `channelId` di sana memeriksa
 *      apakah channel yang diminta ada; jika TIDAK ada, ia memakai
 *      `FALLBACK_CHANNEL_ID = "expo_notifications_fallback_notification_channel"`
 *      yang dibuat saat itu juga dengan `IMPORTANCE_HIGH`.
 *   3. Jadi pengingat tetap tampil walau channel kita gagal dibuat — dengan
 *      konsekuensi: pengaturan channel kita (nama "Pengingat Kuliah",
 *      importance DEFAULT) tidak berlaku dan pengguna melihat channel cadangan
 *      bawaan expo dengan prioritas lebih tinggi.
 *
 * Karena pengingat tidak hilang, `synced` dipertahankan; yang diuji di sini
 * adalah **syarat** yang membuat keputusan itu sah: channel tidak pernah
 * membatalkan penjadwalan, tidak menduplikasi, dan `channelId` tetap dikirim.
 * Bila salah satu syarat itu berubah, uji ini gagal dan keputusan harus
 * ditinjau ulang.
 *
 * Risiko yang tetap ada (tidak bisa diuji tanpa perangkat) dicatat di
 * IMPLEMENTATION_STATUS.md §7.5 sebagai F2A-1.
 */

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createSchedule, getAllSchedules } from '../../db/schedules.ts';
import { CLASS_REMINDER_CHANNEL_ID } from '../../lib/classReminders.ts';
import { syncClassReminders } from '../../lib/notificationSync.ts';
import {
  clearFaults,
  fault,
  mock as notificationsMock,
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

const triggers = () => [...nativeState.scheduled.values()].map((entry) => entry.trigger);

describe('CHANNEL ANDROID — channel dibuat sebelum penjadwalan', () => {
  afterEach(closeDatabase);

  test('channel dibuat sekali dengan id, nama, importance DEFAULT, dan getaran', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());

    await syncClassReminders(database);

    assert.equal(nativeState.calls.channel, 1);
    assert.equal(nativeState.channels.length, 1);
    const [channel] = nativeState.channels;
    assert.equal(channel.identifier, CLASS_REMINDER_CHANNEL_ID);
    assert.equal(channel.identifier, 'class-reminders');
    assert.equal(channel.options.name, 'Pengingat Kuliah');
    assert.equal(channel.options.importance, notificationsMock.AndroidImportance.DEFAULT);
    assert.equal(channel.options.enableVibrate, true);
  });

  test('channel dibuat SEBELUM notifikasi dijadwalkan', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());

    await syncClassReminders(database);

    assert.ok(nativeState.order.indexOf('channel') >= 0, 'channel harus dibuat');
    assert.ok(
      nativeState.order.indexOf('channel') < nativeState.order.indexOf('schedule'),
      'channel harus lebih dulu daripada penjadwalan',
    );
  });

  test('setiap pengingat Android meminta channel "class-reminders"', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput({ dayOfWeek: 1 }));
    await createSchedule(database, scheduleInput({ courseName: 'Statistika', dayOfWeek: 3 }));

    await syncClassReminders(database);

    const requested = triggers().map((trigger) => trigger.channelId);
    assert.deepEqual(requested, [CLASS_REMINDER_CHANNEL_ID, CLASS_REMINDER_CHANNEL_ID]);
  });

  test('iOS tidak pernah membuat channel sama sekali', async (t) => {
    database = await setup(t);
    setPlatform('ios');
    await createSchedule(database, scheduleInput());

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(nativeState.calls.channel, 0, 'channel hanya konsep Android');
    assert.equal(nativeState.channels.length, 0);
  });
});

describe('CHANNEL ANDROID — pembuatan channel GAGAL', () => {
  afterEach(closeDatabase);

  test('semua pengingat tetap dijadwalkan, bukan dilewati', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput({ dayOfWeek: 1 }));
    await createSchedule(database, scheduleInput({ courseName: 'Statistika', dayOfWeek: 3 }));
    await createSchedule(database, scheduleInput({ courseName: 'Pancasila', dayOfWeek: 5 }));
    fault('channel', 'pembuatan channel ditolak sistem');

    const result = await syncClassReminders(database);

    // Keputusan Fase 2A: pengingat tetap dapat tampil lewat channel cadangan
    // native, jadi hasilnya `synced` — tetapi hanya sah bila TIDAK ada satu pun
    // pengingat yang dibuang karena kegagalan channel.
    assert.equal(result.status, 'synced');
    assert.equal(result.scheduled, 3, 'ketiga pengingat tetap dijadwalkan');
    assert.equal(nativeState.scheduled.size, 3);
    assert.equal(nativeState.channels.length, 0, 'channel memang tidak terbentuk');
  });

  test('channelId tetap dikirim walau channel gagal dibuat', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    fault('channel', 'pembuatan channel ditolak sistem');

    await syncClassReminders(database);

    // Inilah syarat berlakunya fallback native: trigger tetap membawa
    // channelId yang kita minta. Bila kode berhenti mengirim channelId,
    // notifikasi jatuh ke channel bawaan tapi niat aplikasi hilang.
    assert.deepEqual(triggers().map((trigger) => trigger.channelId), [CLASS_REMINDER_CHANNEL_ID]);
  });

  test('kegagalan channel tidak membatalkan pengingat yang sudah sesuai', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());

    // Sinkronisasi pertama: channel ada, satu pengingat terjadwal.
    await syncClassReminders(database);
    assert.equal(nativeState.scheduled.size, 1);
    const sebelum = [...nativeState.scheduled.entries()];
    const cancelSebelum = nativeState.calls.cancel;

    fault('channel', 'pembuatan channel gagal pada putaran kedua');
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(result.kept, 1, 'pengingat lama dipertahankan');
    assert.equal(result.cancelled, 0);
    assert.equal(nativeState.calls.cancel, cancelSebelum, 'tidak ada pembatalan baru');
    assert.deepEqual([...nativeState.scheduled.entries()], sebelum, 'isi perangkat tidak berubah');
  });

  test('kegagalan channel tidak pernah membuat notifikasi ganda', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    fault('channel', 'channel selalu gagal');

    await syncClassReminders(database);
    await syncClassReminders(database);
    await syncClassReminders(database);

    assert.equal(nativeState.scheduled.size, 1, 'tetap satu notifikasi per jadwal');
    const scheduleIds = [...nativeState.scheduled.values()].map((entry) => entry.content.data.scheduleId);
    assert.equal(new Set(scheduleIds).size, 1);
  });

  test('channel pulih → dibuat lagi tanpa menduplikasi pengingat', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    fault('channel', 'gagal sementara');

    await syncClassReminders(database);
    assert.equal(nativeState.channels.length, 0);

    clearFaults();
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(nativeState.channels.length, 1, 'channel akhirnya terbentuk');
    assert.equal(nativeState.channels[0].identifier, CLASS_REMINDER_CHANNEL_ID);
    assert.equal(nativeState.scheduled.size, 1, 'tetap satu pengingat');
  });

  test('data jadwal di SQLite tidak tersentuh kegagalan channel', async (t) => {
    database = await setup(t);
    const id = await createSchedule(database, scheduleInput());
    fault('channel', 'pembuatan channel gagal');

    await syncClassReminders(database);

    const schedules = await getAllSchedules(database);
    assert.equal(schedules.length, 1);
    assert.equal(schedules[0].id, id);
    assert.equal(schedules[0].courseName, 'Hukum Dagang');
  });
});
