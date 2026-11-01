/**
 * tests/lib/notificationSync-faults.test.mjs
 *
 * Domain: TEMUAN K12 — sinkronisasi TIDAK atomik.
 *
 * Urutan kerja `syncClassReminders` (kode produksi):
 *   1. baca izin → 2. gerbang → 3. pastikan channel → 4. baca jadwal (SQLite)
 *   → 5. baca notifikasi terjadwal → 6. hitung rekonsiliasi
 *   → 7. BATALKAN yang usang/duplikat → 8. JADWALKAN yang belum ada → 9. lapor.
 *
 * Karena langkah 7 dan 8 tidak berada dalam satu transaksi, ada dua kelas
 * kegagalan yang HASILNYA BERBEDA dan tidak boleh disamakan:
 *
 *   A. gagal SEBELUM pembatalan  → notifikasi lama utuh (tidak ada yang hilang)
 *   B. gagal SETELAH pembatalan  → sebagian notifikasi lama sudah hilang
 *                                   (kekurangan sementara, tetapi tidak pernah
 *                                    menghasilkan duplikat)
 *
 * File ini menyuntikkan kegagalan pada titik yang tepat untuk membuktikan
 * keduanya, lalu memastikan sinkronisasi ulang selalu memulihkan keadaan
 * sesuai isi database.
 */

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createSchedule, getAllSchedules, updateSchedule } from '../../db/schedules.ts';
import { syncClassReminders } from '../../lib/notificationSync.ts';
import {
  clearFaults,
  fault,
  faultAfter,
  injectScheduled,
  reset as resetNative,
  scheduledReminders,
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

const closeDatabase = () => {
  database?.close();
  database = undefined;
};

const setup = async (t) => {
  resetNative();
  setPlatform('android');
  database = await openInitializedDatabase(createTempDir(t));
  await clearContentTables(database);
  return database;
};

const jumlahJadwal = async () => (await getAllSchedules(database)).length;

/**
 * Invarian yang harus selalu benar, bahkan setelah kegagalan di tengah proses:
 * satu jadwal tidak boleh punya lebih dari satu notifikasi.
 */
const assertTidakAdaDuplikat = () => {
  const perJadwal = new Map();
  for (const reminder of scheduledReminders()) {
    const jumlah = (perJadwal.get(reminder.scheduleId) ?? 0) + 1;
    perJadwal.set(reminder.scheduleId, jumlah);
  }
  for (const [scheduleId, jumlah] of perJadwal) {
    assert.equal(jumlah, 1, `jadwal ${scheduleId} punya ${jumlah} notifikasi (duplikat)`);
  }
  return perJadwal;
};

describe('K12 — kegagalan SEBELUM pembatalan: notifikasi lama tetap aman', () => {
  afterEach(closeDatabase);

  test('gagal membaca daftar notifikasi → perangkat tidak berubah sama sekali', async (t) => {
    await setup(t);
    const id = await createSchedule(database, scheduleInput({ startTime: '10:00' }));
    await syncClassReminders(database);

    const sebelum = scheduledReminders();
    assert.equal(sebelum.length, 1);

    // Konfigurasi berubah, tetapi pembacaan daftar notifikasi gagal sebelum
    // satu pun pembatalan dijalankan.
    await updateSchedule(database, id, scheduleInput({ startTime: '13:00', endTime: '14:40' }));
    fault('list', 'daftar notifikasi tidak terbaca');

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'error');
    assert.deepEqual(scheduledReminders(), sebelum, 'notifikasi lama utuh, belum ada yang dibatalkan');
    assert.equal(nativeState.calls.cancel, 0, 'tidak ada pembatalan yang dicoba');
    assert.equal(nativeState.calls.schedule, 1, 'tidak ada penjadwalan baru');
    assertTidakAdaDuplikat();
  });

  test('gagal membaca izin → tidak ada pembatalan maupun penjadwalan', async (t) => {
    await setup(t);
    await createSchedule(database, scheduleInput());
    await syncClassReminders(database);
    const sebelum = scheduledReminders();

    fault('permissionRead', 'izin tidak terbaca');
    await syncClassReminders(database);

    assert.deepEqual(scheduledReminders(), sebelum);
    assert.equal(nativeState.calls.cancel, 0);
    assert.equal(nativeState.calls.schedule, 1);
  });

  test('channel gagal dibuat → sinkronisasi tetap berjalan dan perangkat konsisten', async (t) => {
    await setup(t);
    await createSchedule(database, scheduleInput());

    fault('channel', 'channel gagal dibuat');
    const result = await syncClassReminders(database);

    // Channel adalah optimisasi, bukan prasyarat: penjadwalan tetap dicoba.
    assert.equal(result.status, 'synced');
    assert.equal(nativeState.scheduled.size, 1);
    assertTidakAdaDuplikat();
  });
});

describe('K12 — kegagalan SETELAH pembatalan: kekurangan sementara, bukan duplikat', () => {
  afterEach(closeDatabase);

  test('gagal menjadwalkan setelah notifikasi lama dibatalkan → jumlah notifikasi kurang dari jumlah jadwal', async (t) => {
    await setup(t);
    const id = await createSchedule(database, scheduleInput({ startTime: '10:00' }));
    await syncClassReminders(database);
    assert.equal(nativeState.scheduled.size, 1);

    await updateSchedule(database, id, scheduleInput({ startTime: '13:00', endTime: '14:40' }));

    const lama = scheduledReminders().map((item) => item.identifier);
    fault('schedule', 'penjadwalan ditolak');

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'error');
    assert.equal(
      nativeState.scheduled.size,
      0,
      'perilaku aktual: notifikasi lama sudah dibatalkan, yang baru belum dibuat'
    );
    assert.ok(lama.length === 1 && scheduledReminders().length === 0);
    assertTidakAdaDuplikat();
    assert.equal(await jumlahJadwal(), 1, 'data jadwal tidak tersentuh');
  });

  test('kegagalan pada jadwal kedua: satu berhasil dijadwalkan, satu belum', async (t) => {
    await setup(t);
    await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang', dayOfWeek: 1 }));
    await createSchedule(database, scheduleInput({ courseName: 'Statistika', dayOfWeek: 3 }));

    faultAfter('schedule', 1, 'penjadwalan kedua ditolak');
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'error');
    assert.equal(nativeState.scheduled.size, 1, 'hanya satu dari dua jadwal yang punya notifikasi');
    assertTidakAdaDuplikat();
  });

  test('kegagalan di TENGAH pembatalan: sebagian notifikasi lama hilang, tanpa duplikat', async (t) => {
    await setup(t);
    const pertama = await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang', dayOfWeek: 1 }));
    const kedua = await createSchedule(database, scheduleInput({ courseName: 'Statistika', dayOfWeek: 3 }));
    await syncClassReminders(database);
    assert.equal(nativeState.scheduled.size, 2);

    // Kedua jadwal diubah → keduanya perlu dibatalkan & dijadwalkan ulang.
    await updateSchedule(database, pertama, scheduleInput({ courseName: 'Hukum Dagang', dayOfWeek: 1, startTime: '11:00', endTime: '12:40' }));
    await updateSchedule(database, kedua, scheduleInput({ courseName: 'Statistika', dayOfWeek: 3, startTime: '09:00', endTime: '10:40' }));

    // Pembatalan pertama sukses, pembatalan kedua gagal → loop berhenti.
    faultAfter('cancel', 1, 'pembatalan kedua gagal');

    const result = await syncClassReminders(database);

    assert.equal(result.status, 'error');
    assert.equal(nativeState.calls.cancel, 2, 'dua percobaan pembatalan');
    assert.equal(nativeState.scheduled.size, 1, 'satu notifikasi lama masih ada, tidak ada yang baru');
    assertTidakAdaDuplikat();
  });
});

describe('K12 — pelaporan status dan pemulihan', () => {
  afterEach(closeDatabase);

  test('kegagalan membaca daftar notifikasi dilaporkan error dengan pesan penyebabnya', async (t) => {
    await setup(t);
    await createSchedule(database, scheduleInput());

    fault('list', 'daftar notifikasi tidak terbaca');
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'error');
    assert.match(result.message, /daftar notifikasi tidak terbaca/);
  });

  test('kegagalan pembatalan dilaporkan error dengan pesan penyebabnya', async (t) => {
    await setup(t);
    const id = await createSchedule(database, scheduleInput({ startTime: '10:00' }));
    await syncClassReminders(database);
    await updateSchedule(database, id, scheduleInput({ startTime: '13:00', endTime: '14:40' }));

    fault('cancel', 'pembatalan gagal');
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'error');
    assert.match(result.message, /pembatalan gagal/);
  });

  test('kegagalan penjadwalan dilaporkan error dengan pesan penyebabnya', async (t) => {
    await setup(t);
    await createSchedule(database, scheduleInput());

    fault('schedule', 'penjadwalan gagal');
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'error');
    assert.match(result.message, /penjadwalan gagal/);
  });

  test('rentetan kegagalan berlapis, lalu pulih sepenuhnya', async (t) => {
    await setup(t);
    const id = await createSchedule(database, scheduleInput({ startTime: '10:00' }));

    // 1. gagal sebelum pembatalan (baca daftar notifikasi).
    fault('list', 'gagal pada list');
    assert.equal((await syncClassReminders(database)).status, 'error');

    // 2. pulih: notifikasi pertama dibuat.
    clearFaults();
    assert.equal((await syncClassReminders(database)).status, 'synced');
    assert.equal(nativeState.scheduled.size, 1);

    // 3. gagal saat membatalkan notifikasi usang.
    await updateSchedule(database, id, scheduleInput({ startTime: '11:00', endTime: '12:40' }));
    fault('cancel', 'gagal pada cancel');
    assert.equal((await syncClassReminders(database)).status, 'error');
    assertTidakAdaDuplikat();

    // 4. pulih, lalu gagal saat menjadwalkan.
    clearFaults();
    assert.equal((await syncClassReminders(database)).status, 'synced');

    await updateSchedule(database, id, scheduleInput({ startTime: '13:00', endTime: '14:40' }));
    fault('schedule', 'gagal pada schedule');
    assert.equal((await syncClassReminders(database)).status, 'error');
    assertTidakAdaDuplikat();

    // 5. pulih total: satu notifikasi, sesuai data terbaru.
    clearFaults();
    const akhir = await syncClassReminders(database);
    assert.equal(akhir.status, 'synced');
    assert.equal(nativeState.scheduled.size, 1);
    assertTidakAdaDuplikat();

    const [entry] = [...nativeState.scheduled.values()];
    assert.equal(entry.trigger.hour, 12, 'pengingat mengikuti jam mulai terbaru (13.00 − 15 menit)');
  });

  test('sinkronisasi ulang memulihkan tepat satu notifikasi per jadwal (tanpa sisa duplikat)', async (t) => {
    await setup(t);
    await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang', dayOfWeek: 1 }));
    await createSchedule(database, scheduleInput({ courseName: 'Statistika', dayOfWeek: 3 }));
    await createSchedule(database, scheduleInput({ courseName: 'Hukum Pidana', dayOfWeek: 5 }));

    // Kegagalan parsial: satu penjadwalan sukses, sisanya gagal.
    faultAfter('schedule', 1, 'penjadwalan macet');
    const gagal = await syncClassReminders(database);
    assert.equal(gagal.status, 'error');
    assert.equal(nativeState.scheduled.size, 1);

    clearFaults();
    const pulih = await syncClassReminders(database);

    assert.equal(pulih.status, 'synced');
    assert.equal(nativeState.scheduled.size, 3, 'jumlah notifikasi kembali sama dengan jumlah jadwal');

    const perJadwal = assertTidakAdaDuplikat();
    assert.equal(perJadwal.size, 3);

    const idJadwal = (await getAllSchedules(database)).map((schedule) => schedule.id).sort();
    assert.deepEqual([...perJadwal.keys()].sort(), idJadwal, 'setiap jadwal tepat satu notifikasi');
  });

  test('pemulihan tetap benar setelah kegagalan berturut-turut', async (t) => {
    await setup(t);
    await createSchedule(database, scheduleInput());

    for (let putaran = 0; putaran < 3; putaran += 1) {
      fault('schedule', `gagal putaran ${putaran + 1}`);
      const hasil = await syncClassReminders(database);
      assert.equal(hasil.status, 'error');
      assertTidakAdaDuplikat();
    }

    clearFaults();
    const pulih = await syncClassReminders(database);
    assert.equal(pulih.status, 'synced');
    assert.equal(nativeState.scheduled.size, 1);
    assertTidakAdaDuplikat();
  });

  test('kegagalan tidak memengaruhi data jadwal di SQLite', async (t) => {
    await setup(t);
    const id = await createSchedule(database, scheduleInput({ courseName: 'Hukum Dagang', startTime: '10:00' }));

    fault('schedule', 'gagal');
    await syncClassReminders(database);

    const jadwal = (await getAllSchedules(database))[0];
    assert.equal(jadwal.id, id);
    assert.equal(jadwal.startTime, '10:00');
    assert.equal(jadwal.courseName, 'Hukum Dagang');
  });

  test('notifikasi yatim dibatalkan walaupun penjadwalan gagal (pembersihan tetap jalan)', async (t) => {
    await setup(t);
    injectScheduled('yatim-1', { type: 'class-reminder', scheduleId: 4242, fingerprint: 'v1|lama' });
    await createSchedule(database, scheduleInput());

    fault('schedule', 'penjadwalan gagal');
    const result = await syncClassReminders(database);

    assert.equal(result.status, 'error');
    assert.equal(nativeState.scheduled.has('yatim-1'), false, 'pembatalan sudah terjadi sebelum kegagalan');
    assert.equal(nativeState.scheduled.size, 0);
  });
});
