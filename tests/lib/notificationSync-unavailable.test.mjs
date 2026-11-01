/**
 * tests/lib/notificationSync-unavailable.test.mjs
 *
 * Domain: SINKRONISASI saat modul native TIDAK ADA di build (D6) dan saat
 * platform memang tidak mendukung (web).
 *
 * File terpisah karena `lib/notifications.ts` menyimpan cache keberhasilan
 * pemuatan modul: keadaan "modul tidak ada" hanya bisa diuji di proses yang
 * belum pernah memuat modul tersebut.
 */

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createSchedule, deleteSchedule, getAllSchedules, updateSchedule } from '../../db/schedules.ts';
import { enableClassReminders, requestReminderSync, syncClassReminders } from '../../lib/notificationSync.ts';
import { state as nativeState } from '../support/native/expo-notifications.mjs';
import { setPlatform } from '../support/native/react-native.mjs';
import {
  clearContentTables,
  createTempDir,
  openInitializedDatabase,
} from '../support/db-fixtures.mjs';

nativeState.installed = false;
setPlatform('android');

let database;

const closeDatabase = () => {
  database?.close();
  database = undefined;
};

const setup = async (t) => {
  database = await openInitializedDatabase(createTempDir(t));
  await clearContentTables(database);
  nativeState.installed = false;
  setPlatform('android');
  return database;
};

const flush = async () => {
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const scheduleInput = (overrides = {}) => ({
  courseName: 'Hukum Dagang',
  dayOfWeek: 1,
  startTime: '10:00',
  endTime: '11:40',
  room: 'B-204',
  reminderMinutes: 15,
  ...overrides,
});

describe('SINKRONISASI — modul native tidak tersedia di build', () => {
  afterEach(closeDatabase);

  test('sinkronisasi melaporkan module-unavailable, bukan permission-denied', async (t) => {
    await setup(t);
    await createSchedule(database, scheduleInput());

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'module-unavailable');
    assert.notEqual(result.status, 'permission-denied');
    assert.notEqual(result.status, 'unsupported');
  });

  test('tidak ada satu pun operasi native yang dicoba', async (t) => {
    await setup(t);
    await createSchedule(database, scheduleInput());

    await syncClassReminders(database);

    assert.equal(nativeState.calls.channel, 0);
    assert.equal(nativeState.calls.permissionRead, 0);
    assert.equal(nativeState.calls.list, 0);
    assert.equal(nativeState.calls.schedule, 0);
    assert.equal(nativeState.calls.cancel, 0);
  });

  test('aksi "Aktifkan pengingat" melaporkan module-unavailable tanpa dialog izin', async (t) => {
    await setup(t);
    await createSchedule(database, scheduleInput());

    const result = await enableClassReminders(database);

    assert.equal(result.status, 'module-unavailable');
    assert.equal(nativeState.calls.permissionRequest, 0, 'dialog izin tidak pernah dipanggil');
    assert.equal(nativeState.calls.channel, 0);
  });

  test('CRUD jadwal tetap berjalan penuh tanpa modul notifikasi', async (t) => {
    await setup(t);

    const id = await createSchedule(database, scheduleInput());
    assert.equal((await getAllSchedules(database)).length, 1);

    await updateSchedule(database, id, scheduleInput({ startTime: '13:00', endTime: '14:40' }));
    assert.equal((await getAllSchedules(database))[0].startTime, '13:00');

    await deleteSchedule(database, id);
    assert.deepEqual(await getAllSchedules(database), []);
  });

  test('pemanggilan latar belakang tidak melempar dan tidak menghasilkan unhandled rejection', async (t) => {
    const rejections = [];
    const listener = (reason) => rejections.push(String(reason));
    process.on('unhandledRejection', listener);
    t.after(() => process.off('unhandledRejection', listener));

    await setup(t);
    await createSchedule(database, scheduleInput());

    requestReminderSync(database);
    await flush();

    assert.deepEqual(rejections, []);
  });

  test('platform web dilaporkan unsupported (bukan module-unavailable)', async (t) => {
    await setup(t);
    await createSchedule(database, scheduleInput());
    setPlatform('web');

    const sinkron = await syncClassReminders(database);
    const aktif = await enableClassReminders(database);

    assert.equal(sinkron.status, 'unsupported');
    assert.equal(aktif.status, 'unsupported');
    setPlatform('android');
  });
});
