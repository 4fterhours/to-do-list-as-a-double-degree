/**
 * tests/lib/notificationSync.test.mjs
 *
 * Domain: SINKRONISASI NOTIFIKASI (D5).
 *
 * Rantai yang diuji adalah rantai produksi lengkap:
 *   lib/notificationSync.ts → lib/notificationScheduler.ts → (modul native tiruan)
 *   lib/notificationSync.ts → lib/notifications.ts → (izin tiruan)
 *   lib/notificationSync.ts → db/schedules.ts → SQLite nyata (node:sqlite)
 *
 * Hanya dua batas native yang dipalsukan (`expo-notifications`, `Platform`).
 */

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createSchedule, deleteSchedule, getAllSchedules, updateSchedule } from '../../db/schedules.ts';
import { enableClassReminders, requestReminderSync, syncClassReminders } from '../../lib/notificationSync.ts';
import {
  clearFaults,
  fault,
  injectScheduled,
  reset as resetNative,
  scheduledReminders,
  state as nativeState,
} from '../support/native/expo-notifications.mjs';
import { PERMISSION_UNREADABLE_MESSAGE } from '../../lib/notifications.ts';
import { setPlatform } from '../support/native/react-native.mjs';
import {
  clearContentTables,
  createTempDir,
  openInitializedDatabase,
} from '../support/db-fixtures.mjs';
import { brokenDatabase, withFailingMethod } from '../support/sqlite.mjs';

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

/** Database bersih + modul native tiruan pada keadaan awal yang sehat. */
const setup = async (t) => {
  resetNative();
  setPlatform('android');
  const database = await openInitializedDatabase(createTempDir(t));
  await clearContentTables(database);
  return database;
};

/** Memberi kesempatan promise latar belakang selesai. */
const flush = async () => {
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const ids = () => scheduledReminders().map((item) => item.identifier);

/** Menutup database test bila ada, lalu melupakan referensinya. */
const closeDatabase = () => {
  database?.close();
  database = undefined;
};

describe('SINKRONISASI — jalur sukses', () => {
  afterEach(closeDatabase);

  test('jadwal di SQLite menjadi satu notifikasi mingguan per jadwal', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang', dayOfWeek: 1 }));
    await createSchedule(database, scheduleInput({ courseName: 'Statistika', dayOfWeek: 3 }));

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(result.scheduled, 2);
    assert.equal(result.totalSchedules, 2);
    assert.equal(nativeState.scheduled.size, 2);

    const trigger = [...nativeState.scheduled.values()][0].trigger;
    assert.equal(trigger.type, 'weekly', 'Android memakai trigger WEEKLY berulang');
    assert.equal(trigger.channelId, 'class-reminders');
    assert.equal(trigger.delivery, 'bestEffort', 'bukan alarm exact (FR-D6)');
  });

  test('isi notifikasi memakai judul dan badan dari data jadwal (AC-D10)', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang', startTime: '10:00' }));

    await syncClassReminders(database);

    const [entry] = [...nativeState.scheduled.values()];
    assert.equal(entry.content.title, 'Hukum Dagang akan dimulai');
    assert.match(entry.content.body, /pukul 10\.00/);
    assert.match(entry.content.body, /ruang B-204/);
    assert.equal(entry.content.data.type, 'class-reminder');
  });

  test('slot pengingat dipetakan ke weekday 1–7 (Senin 09.45 → weekday 2)', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput({ dayOfWeek: 1, startTime: '10:00', reminderMinutes: 15 }));

    await syncClassReminders(database);

    const [entry] = [...nativeState.scheduled.values()];
    assert.equal(entry.trigger.weekday, 2, 'Minggu = 1 sehingga Senin = 2');
    assert.equal(entry.trigger.hour, 9);
    assert.equal(entry.trigger.minute, 45);
  });

  test('iOS memakai trigger CALENDAR berulang, bukan WEEKLY (cabang platform scheduler)', async (t) => {
    database = await setup(t);
    setPlatform('ios');
    await createSchedule(database, scheduleInput({ dayOfWeek: 1, startTime: '10:00', reminderMinutes: 15 }));

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(nativeState.scheduled.size, 1);

    const [entry] = [...nativeState.scheduled.values()];
    assert.equal(entry.trigger.type, 'calendar');
    assert.equal(entry.trigger.repeats, true, 'notifikasi harus berulang mingguan');
    assert.equal(entry.trigger.weekday, 2);
    assert.equal(entry.trigger.hour, 9);
    assert.equal(entry.trigger.minute, 45);
    assert.equal(entry.trigger.channelId, undefined, 'channel hanya konsep Android');
  });

  test('pengingat lintas tengah malam dijadwalkan pada hari sebelumnya (AC-D5)', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput({ dayOfWeek: 1, startTime: '07:00', endTime: '08:40', reminderMinutes: 600 }));

    await syncClassReminders(database);

    const [entry] = [...nativeState.scheduled.values()];
    assert.equal(entry.trigger.weekday, 1, 'Minggu (weekday 1), bukan Senin');
    assert.equal(entry.trigger.hour, 21);
    assert.equal(entry.trigger.minute, 0);
  });

  test('sinkronisasi berulang tidak menduplikasi dan mempertahankan identifier (AC-D8)', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());

    const first = await syncClassReminders(database);
    const identifiers = ids();

    assert.equal(first.scheduled, 1);
    for (let run = 0; run < 4; run += 1) {
      const again = await syncClassReminders(database);
      assert.equal(again.status, 'synced');
      assert.equal(again.scheduled, 0, `putaran ${run + 2}: tidak ada penjadwalan baru`);
      assert.equal(again.cancelled, 0);
      assert.equal(again.kept, 1, 'notifikasi yang sudah sesuai dipertahankan');
    }

    assert.equal(nativeState.scheduled.size, 1);
    assert.deepEqual(ids(), identifiers);
    assert.equal(nativeState.calls.cancelAll, 0, 'tidak memakai cancelAll (fitur lain aman)');
  });
});

describe('SINKRONISASI — perubahan data', () => {
  afterEach(closeDatabase);

  test('jadwal baru menambah satu notifikasi', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang' }));
    await syncClassReminders(database);
    assert.equal(nativeState.scheduled.size, 1);

    await createSchedule(database, scheduleInput({ courseName: 'Statistika', dayOfWeek: 3 }));
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(result.scheduled, 1, 'hanya jadwal baru yang dijadwalkan');
    assert.equal(result.kept, 1);
    assert.equal(nativeState.scheduled.size, 2);
  });

  test('mengubah jam jadwal membatalkan notifikasi lama dan membuat yang baru (AC-D6)', async (t) => {
    database = await setup(t);
    const id = await createSchedule(database, scheduleInput({ startTime: '10:00' }));
    await syncClassReminders(database);

    const lama = ids();
    await updateSchedule(database, id, scheduleInput({ startTime: '13:00', endTime: '14:40' }));
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(result.cancelled, 1);
    assert.equal(result.scheduled, 1);
    assert.equal(nativeState.scheduled.size, 1, 'tetap satu notifikasi untuk satu jadwal');

    const baru = ids();
    assert.equal(baru.length, 1);
    assert.ok(!lama.includes(baru[0]), 'identifier lama sudah dibatalkan');

    const [entry] = [...nativeState.scheduled.values()];
    assert.equal(entry.trigger.hour, 12, 'pengingat 15 menit sebelum 13.00');
  });

  test('mengubah ruang saja juga memperbarui notifikasi', async (t) => {
    database = await setup(t);
    const id = await createSchedule(database, scheduleInput({ room: 'B-204' }));
    await syncClassReminders(database);

    await updateSchedule(database, id, scheduleInput({ room: 'C-101' }));
    const result = await syncClassReminders(database);

    assert.equal(result.cancelled, 1);
    assert.equal(result.scheduled, 1);
    assert.match([...nativeState.scheduled.values()][0].content.body, /C-101/);
  });

  test('menghapus jadwal membatalkan notifikasinya dan tidak mengganggu yang lain (AC-D7)', async (t) => {
    database = await setup(t);
    const dagang = await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang', dayOfWeek: 1 }));
    await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang', dayOfWeek: 3 }));
    await syncClassReminders(database);
    assert.equal(nativeState.scheduled.size, 2);

    await deleteSchedule(database, dagang);
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(result.cancelled, 1);
    assert.equal(nativeState.scheduled.size, 1, 'sesi lain mata kuliah yang sama tetap punya pengingat');

    const tersisa = scheduledReminders()[0];
    assert.equal(tersisa.scheduleId, (await getAllSchedules(database))[0].id);
  });

  test('menghapus semua jadwal meninggalkan nol notifikasi', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    await syncClassReminders(database);

    for (const schedule of await getAllSchedules(database)) {
      await deleteSchedule(database, schedule.id);
    }
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(result.scheduled, 0);
    assert.equal(nativeState.scheduled.size, 0);
  });
});

describe('SINKRONISASI — pembersihan perangkat', () => {
  afterEach(closeDatabase);

  test('notifikasi yatim (jadwalnya sudah tidak ada) dibatalkan', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    injectScheduled('yatim-1', { type: 'class-reminder', scheduleId: 9999, fingerprint: 'v1|lama' });

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'synced');
    assert.equal(result.cancelled, 1);
    assert.deepEqual(ids(), ['native-1']);
  });

  test('notifikasi duplikat untuk jadwal yang sama dibersihkan menjadi satu', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());

    const [entry] = (await syncClassReminders(database), scheduledReminders());
    injectScheduled('duplikat-1', {
      type: 'class-reminder',
      scheduleId: entry.scheduleId,
      fingerprint: entry.fingerprint,
    });
    assert.equal(nativeState.scheduled.size, 2);

    const result = await syncClassReminders(database);

    assert.equal(result.duplicatesRemoved, 1);
    assert.equal(nativeState.scheduled.size, 1);
  });

  test('notifikasi milik fitur lain tidak pernah disentuh', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    injectScheduled('lain-1', { type: 'task-reminder', taskId: 1 }, { title: 'Pengingat tugas' });

    await syncClassReminders(database);

    assert.ok(nativeState.scheduled.has('lain-1'), 'notifikasi bertipe lain dibiarkan');
    assert.equal(nativeState.calls.cancelAll, 0);
  });

  test('metadata rusak dibatalkan, bukan dibiarkan menumpuk', async (t) => {
    database = await setup(t);
    injectScheduled('rusak-1', { type: 'class-reminder' });

    const result = await syncClassReminders(database);

    assert.equal(result.cancelled, 1);
    assert.equal(nativeState.scheduled.size, 0);
  });
});

describe('SINKRONISASI — kegagalan', () => {
  afterEach(closeDatabase);

  test('izin belum ada → permission-denied, tanpa penjadwalan maupun pembatalan (AC-D3)', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    await syncClassReminders(database);
    const sebelum = ids();

    nativeState.permission = { granted: false, canAskAgain: true, status: 'denied' };
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'permission-denied');
    assert.deepEqual(ids(), sebelum, 'notifikasi lama tidak disentuh');
    assert.equal(nativeState.calls.schedule, 1, 'tidak ada penjadwalan baru');
  });

  test('izin diblokir permanen juga permission-denied, bukan error', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    nativeState.permission = { granted: false, canAskAgain: false, status: 'denied' };

    const result = await syncClassReminders(database);
    assert.equal(result.status, 'permission-denied');
  });

  test('gagal membaca izin: dilaporkan error, bukan permission-denied (regresi F2-1)', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    fault('permissionRead', 'pembacaan izin gagal');

    // Diperbaiki di Fase 2A: izin yang GAGAL DIBACA bukan izin yang DITOLAK.
    // Sebelum perbaikan, `syncGateFor` hanya melihat `granted` sehingga kasus
    // ini salah dilaporkan sebagai `permission-denied`.
    const result = await syncClassReminders(database);
    assert.equal(result.status, 'error');
    assert.equal(result.message, PERMISSION_UNREADABLE_MESSAGE);

    // Yang penting dan dijamin: tidak ada notifikasi tersentuh.
    assert.equal(nativeState.calls.schedule, 0);
    assert.equal(nativeState.calls.cancel, 0);
    assert.equal(nativeState.scheduled.size, 0);
  });

  test('kegagalan penjadwalan → error dengan pesan penyebab, jadwal tetap utuh', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    fault('schedule', 'kunci notifikasi ditolak');

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'error');
    assert.match(result.message, /kunci notifikasi ditolak/);
    assert.equal((await getAllSchedules(database)).length, 1, 'data jadwal tidak hilang');
    assert.equal(nativeState.scheduled.size, 0);
  });

  test('database gagal dibaca → error, bukan crash', async (t) => {
    database = await setup(t);
    const rusak = withFailingMethod(database, 'getAllAsync', 'tabel jadwal tidak terbaca');

    const result = await syncClassReminders(rusak);

    assert.equal(result.status, 'error');
    assert.match(result.message, /tabel jadwal tidak terbaca/);
  });

  test('database rusak total → error tanpa melempar ke pemanggil', async (t) => {
    database = await setup(t);
    const result = await syncClassReminders(brokenDatabase('koneksi database tertutup'));

    assert.equal(result.status, 'error');
    assert.match(result.message, /koneksi database tertutup/);
  });

  test('platform web → unsupported, tidak menyentuh perangkat', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    setPlatform('web');

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'unsupported');
    assert.equal(nativeState.calls.list, 0);
    setPlatform('android');
  });

  test('percobaan ulang setelah kegagalan memulihkan keadaan sesuai database', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang' }));
    await createSchedule(database, scheduleInput({ courseName: 'Statistika', dayOfWeek: 3 }));

    fault('schedule', 'sementara gagal');
    const gagal = await syncClassReminders(database);
    assert.equal(gagal.status, 'error');
    assert.equal(nativeState.scheduled.size, 0);

    clearFaults();
    const pulih = await syncClassReminders(database);

    assert.equal(pulih.status, 'synced');
    assert.equal(pulih.scheduled, 2);
    assert.equal(nativeState.scheduled.size, 2);
    assert.deepEqual(
      scheduledReminders().map((item) => item.scheduleId).sort(),
      (await getAllSchedules(database)).map((schedule) => schedule.id).sort()
    );
  });
});

describe('SINKRONISASI — pemanggilan latar belakang', () => {
  afterEach(closeDatabase);

  test('requestReminderSync tidak pernah menghasilkan unhandled rejection', async (t) => {
    const rejections = [];
    const listener = (reason) => rejections.push(String(reason));
    process.on('unhandledRejection', listener);
    t.after(() => process.off('unhandledRejection', listener));

    database = await setup(t);
    await createSchedule(database, scheduleInput());

    fault('schedule', 'gagal saat latar belakang');
    requestReminderSync(database);
    await flush();

    assert.deepEqual(rejections, [], 'tidak boleh ada unhandled rejection');
    assert.equal(nativeState.scheduled.size, 0);

    clearFaults();
    requestReminderSync(database);
    await flush();
    assert.equal(nativeState.scheduled.size, 1, 'pemanggilan berikutnya berhasil');
  });

  test('requestReminderSync dengan database rusak tetap tidak melempar', async (t) => {
    const rejections = [];
    const listener = (reason) => rejections.push(String(reason));
    process.on('unhandledRejection', listener);
    t.after(() => process.off('unhandledRejection', listener));

    requestReminderSync(brokenDatabase('bagian latar belakang rusak'));
    await flush();

    assert.deepEqual(rejections, []);
  });

  test('CRUD jadwal tetap berhasil walau notifikasi gagal', async (t) => {
    database = await setup(t);
    fault('schedule', 'penjadwalan selalu gagal');

    const id = await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang' }));
    requestReminderSync(database);
    await flush();

    await updateSchedule(database, id, scheduleInput({ courseName: 'Hukum Dagang', startTime: '13:00', endTime: '14:40' }));
    requestReminderSync(database);
    await flush();

    const setelahUpdate = await getAllSchedules(database);
    assert.equal(setelahUpdate.length, 1);
    assert.equal(setelahUpdate[0].startTime, '13:00');

    await deleteSchedule(database, id);
    requestReminderSync(database);
    await flush();

    assert.deepEqual(await getAllSchedules(database), [], 'hapus tetap berhasil');
  });
});

describe('SINKRONISASI — aksi pengguna "Aktifkan pengingat"', () => {
  afterEach(closeDatabase);

  test('izin diberikan → channel dibuat lalu pengingat dijadwalkan', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());

    const result = await enableClassReminders(database);

    assert.equal(result.status, 'synced');
    const urutan = nativeState.order;
    assert.ok(
      urutan.indexOf('channel') < urutan.indexOf('permissionRequest'),
      `channel harus dibuat sebelum dialog izin (urutan: ${urutan.join(' → ')})`
    );
    assert.ok(
      urutan.indexOf('permissionRequest') < urutan.indexOf('schedule'),
      'penjadwalan terjadi setelah izin diberikan'
    );
    assert.equal(nativeState.channels.length, 1);
    assert.equal(nativeState.scheduled.size, 1);
  });

  test('izin ditolak pengguna → permission-denied, jadwal tetap ada', async (t) => {
    database = await setup(t);
    await createSchedule(database, scheduleInput());
    nativeState.permission = { granted: false, canAskAgain: true, status: 'denied' };

    const result = await enableClassReminders(database);

    assert.equal(result.status, 'permission-denied');
    assert.equal(nativeState.scheduled.size, 0);
    assert.equal((await getAllSchedules(database)).length, 1);
  });

  test('platform web → unsupported tanpa meminta izin', async (t) => {
    database = await setup(t);
    setPlatform('web');

    const result = await enableClassReminders(database);

    assert.equal(result.status, 'unsupported');
    assert.equal(nativeState.calls.permissionRequest, 0);
    setPlatform('android');
  });
});
