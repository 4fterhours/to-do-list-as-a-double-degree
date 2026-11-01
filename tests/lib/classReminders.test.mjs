/**
 * tests/lib/classReminders.test.mjs
 *
 * Domain: LOGIKA PENGINGAT KELAS (murni).
 *
 * Kode yang diuji: lib/classReminders.ts — konversi weekday, slot pengingat
 * (termasuk lintas tengah malam, 0 menit, dan 1440 menit), isi notifikasi,
 * fingerprint, gerbang sinkronisasi, dan rekonsiliasi idempoten.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  CLASS_REMINDER_CHANNEL_ID,
  CLASS_REMINDER_TYPE,
  buildReminderContent,
  buildReminderFingerprint,
  fromExpoWeekday,
  planReminders,
  reconcileReminders,
  reminderSlot,
  syncGateFor,
  toExpoWeekday,
} from '../../lib/classReminders.ts';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const expoDayName = (weekday) => DAY_NAMES[(weekday - 1 + 7) % 7];

const source = (overrides = {}) => ({
  id: 7,
  courseName: 'Hukum Dagang',
  dayOfWeek: 1,
  startTime: '10:00',
  room: 'B-204',
  reminderMinutes: 15,
  ...overrides,
});

describe('PENGINGAT — konversi hari', () => {
  test('konvensi database (0 = Minggu) dipetakan ke konvensi expo (1 = Minggu)', () => {
    assert.equal(toExpoWeekday(0), 1);
    assert.equal(toExpoWeekday(1), 2);
    assert.equal(toExpoWeekday(6), 7);
    assert.equal(expoDayName(toExpoWeekday(1)), 'Senin');
    assert.equal(expoDayName(toExpoWeekday(0)), 'Minggu');
  });

  test('konversi bolak-balik konsisten untuk semua hari', () => {
    for (let day = 0; day <= 6; day += 1) {
      assert.equal(fromExpoWeekday(toExpoWeekday(day)), day);
    }
  });

  test('nilai di luar rentang ditolak', () => {
    for (const invalid of [-1, 7, 1.5, Number.NaN]) {
      assert.throws(() => toExpoWeekday(invalid), RangeError);
    }
    for (const invalid of [0, 8, 2.5]) {
      assert.throws(() => fromExpoWeekday(invalid), RangeError);
    }
  });
});

describe('PENGINGAT — slot waktu', () => {
  const slot = (day, start, minutes) => {
    const result = reminderSlot(day, start, minutes);
    return {
      hari: expoDayName(result.weekday),
      jam: `${String(result.hour).padStart(2, '0')}:${String(result.minute).padStart(2, '0')}`,
      dayShift: result.dayShift,
    };
  };

  test('pengingat biasa: Senin 10.00 − 15 menit = Senin 09.45', () => {
    assert.deepEqual(slot(1, '10:00', 15), { hari: 'Senin', jam: '09:45', dayShift: 0 });
    assert.deepEqual(slot(1, '10:00', 60), { hari: 'Senin', jam: '09:00', dayShift: 0 });
  });

  test('pengingat 0 menit berbunyi tepat saat kelas dimulai', () => {
    assert.deepEqual(slot(3, '08:00', 0), { hari: 'Rabu', jam: '08:00', dayShift: 0 });
  });

  test('pengingat 1440 menit = tepat 24 jam sebelumnya, hari mundur satu', () => {
    assert.deepEqual(slot(1, '10:00', 1440), { hari: 'Minggu', jam: '10:00', dayShift: -1 });
    assert.deepEqual(slot(0, '10:00', 1440), { hari: 'Sabtu', jam: '10:00', dayShift: -1 });
  });

  test('lintas tengah malam: Senin 07.00 − 600 menit = Minggu 21.00 (AC-D5)', () => {
    assert.deepEqual(slot(1, '07:00', 600), { hari: 'Minggu', jam: '21:00', dayShift: -1 });
  });

  test('lintas tengah malam dari hari pertama minggu: Minggu 00.15 − 30 menit = Sabtu 23.45', () => {
    assert.deepEqual(slot(0, '00:15', 30), { hari: 'Sabtu', jam: '23:45', dayShift: -1 });
  });

  test('lintas tengah malam dengan 1 menit: Rabu 00.00 − 1 = Selasa 23.59', () => {
    assert.deepEqual(slot(3, '00:00', 1), { hari: 'Selasa', jam: '23:59', dayShift: -1 });
  });

  test('menit pengingat di luar 0–1440 ditolak', () => {
    for (const invalid of [-1, 1441, 1.5]) {
      assert.throws(() => reminderSlot(1, '10:00', invalid), RangeError);
    }
  });

  test('seluruh kombinasi hari, jam, dan pengingat menghasilkan slot yang sah', () => {
    for (let day = 0; day <= 6; day += 1) {
      for (const minutes of [0, 1, 15, 60, 600, 1439, 1440]) {
        for (const start of ['00:00', '07:30', '12:00', '23:59']) {
          const result = reminderSlot(day, start, minutes);
          assert.ok(result.weekday >= 1 && result.weekday <= 7);
          assert.ok(result.hour >= 0 && result.hour <= 23);
          assert.ok(result.minute >= 0 && result.minute <= 59);
          assert.ok(result.dayShift === 0 || result.dayShift === -1);
        }
      }
    }
  });
});

describe('PENGINGAT — isi notifikasi', () => {
  test('isi menyebut mata kuliah, jam, dan ruang (AC-D10)', () => {
    const content = buildReminderContent(source());
    assert.equal(content.title, 'Hukum Dagang akan dimulai');
    assert.match(content.body, /pukul 10\.00/);
    assert.match(content.body, /ruang B-204/);
  });

  test('tanpa ruang kalimatnya tetap natural dan tidak menyebut "ruang"', () => {
    const content = buildReminderContent(source({ room: null }));
    assert.match(content.body, /Kelas dimulai pukul 10\.00\./);
    assert.doesNotMatch(content.body, /ruang/i);
  });

  test('ruang berisi spasi dianggap tidak ada', () => {
    const content = buildReminderContent(source({ room: '   ' }));
    assert.doesNotMatch(content.body, /ruang/i);
  });
});

describe('PENGINGAT — fingerprint', () => {
  test('berubah bila konfigurasi yang memengaruhi notifikasi berubah', () => {
    const dasar = buildReminderFingerprint(source());

    assert.notEqual(buildReminderFingerprint(source({ startTime: '11:00' })), dasar);
    assert.notEqual(buildReminderFingerprint(source({ dayOfWeek: 2 })), dasar);
    assert.notEqual(buildReminderFingerprint(source({ reminderMinutes: 30 })), dasar);
    assert.notEqual(buildReminderFingerprint(source({ room: 'A-1' })), dasar);
    assert.notEqual(buildReminderFingerprint(source({ courseName: 'Statistika' })), dasar);
  });

  test('fingerprint sama untuk input yang sama', () => {
    assert.equal(buildReminderFingerprint(source()), buildReminderFingerprint(source()));
  });
});

describe('PENGINGAT — gerbang sinkronisasi', () => {
  test('platform tanpa dukungan → unsupported', () => {
    assert.equal(syncGateFor({ supported: false, moduleAvailable: false, granted: false }), 'unsupported');
  });

  test('platform didukung tanpa modul native → module-unavailable (bukan permission-denied)', () => {
    assert.equal(
      syncGateFor({ supported: true, moduleAvailable: false, granted: false }),
      'module-unavailable'
    );
  });

  test('modul ada tetapi izin belum ada → permission-denied', () => {
    assert.equal(
      syncGateFor({ supported: true, moduleAvailable: true, granted: false }),
      'permission-denied'
    );
  });

  test('modul ada dan izin ada → proceed', () => {
    assert.equal(syncGateFor({ supported: true, moduleAvailable: true, granted: true }), 'proceed');

    // F2-1: `granted: false` karena pembacaan izin GAGAL bukan penolakan.
    assert.equal(
      syncGateFor({ supported: true, moduleAvailable: true, granted: false, status: 'error' }),
      'error',
    );
    // Izin yang benar-benar ditolak tetap 'permission-denied'.
    assert.equal(
      syncGateFor({ supported: true, moduleAvailable: true, granted: false, status: 'denied' }),
      'permission-denied',
    );
    // Tanpa `status` (pemanggil lama) perilaku lama dipertahankan.
    assert.equal(
      syncGateFor({ supported: true, moduleAvailable: true, granted: false }),
      'permission-denied',
    );
  });
});

describe('PENGINGAT — rencana dan rekonsiliasi', () => {
  const plan = planReminders([source({ id: 1 }), source({ id: 2, courseName: 'Statistika', dayOfWeek: 3 })]);

  test('rencana berisi satu notifikasi per jadwal dengan metadata lengkap', () => {
    assert.equal(plan.length, 2);
    assert.equal(plan[0].data.type, CLASS_REMINDER_TYPE);
    assert.equal(plan[0].data.scheduleId, 1);
    assert.equal(plan[0].data.fingerprint, buildReminderFingerprint(source({ id: 1 })));
    assert.equal(CLASS_REMINDER_CHANNEL_ID, 'class-reminders');
  });

  test('perangkat kosong → semua dijadwalkan, tidak ada yang dibatalkan', () => {
    const result = reconcileReminders([], plan);
    assert.deepEqual(result.schedule.map((item) => item.scheduleId), [1, 2]);
    assert.deepEqual(result.cancel, []);
    assert.deepEqual(result.keep, []);
    assert.equal(result.duplicates, 0);
  });

  test('notifikasi yang sudah sesuai dipertahankan (idempoten)', () => {
    const existing = plan.map((item, index) => ({
      identifier: `n${index + 1}`,
      scheduleId: item.scheduleId,
      fingerprint: item.fingerprint,
    }));

    const result = reconcileReminders(existing, plan);
    assert.deepEqual(result.keep, ['n1', 'n2']);
    assert.deepEqual(result.cancel, []);
    assert.deepEqual(result.schedule, []);
  });

  test('fingerprint berubah → notifikasi lama dibatalkan dan dijadwalkan ulang', () => {
    const existing = [
      { identifier: 'n1', scheduleId: 1, fingerprint: 'v1|1|Hukum Dagang|1|09:00||15' },
    ];

    const result = reconcileReminders(existing, plan);
    assert.deepEqual(result.cancel, ['n1']);
    assert.deepEqual(result.schedule.map((item) => item.scheduleId), [1, 2]);
  });

  test('jadwal yang sudah dihapus → notifikasi menjadi yatim dan dibatalkan', () => {
    const existing = [
      { identifier: 'n1', scheduleId: 1, fingerprint: plan[0].fingerprint },
      { identifier: 'n9', scheduleId: 99, fingerprint: 'v1|99|Hilang|2|10:00||15' },
    ];

    const result = reconcileReminders(existing, plan);
    assert.deepEqual(result.cancel, ['n9']);
    assert.deepEqual(result.keep, ['n1']);
    assert.deepEqual(result.schedule.map((item) => item.scheduleId), [2]);
  });

  test('dua notifikasi untuk jadwal yang sama → hanya satu dipertahankan', () => {
    const existing = [
      { identifier: 'n1', scheduleId: 1, fingerprint: plan[0].fingerprint },
      { identifier: 'n2', scheduleId: 1, fingerprint: plan[0].fingerprint },
    ];

    const result = reconcileReminders(existing, plan);
    assert.deepEqual(result.keep, ['n1']);
    assert.deepEqual(result.cancel, ['n2']);
    assert.equal(result.duplicates, 1);
  });

  test('metadata rusak (tanpa scheduleId) dibatalkan, bukan dibiarkan', () => {
    const result = reconcileReminders([{ identifier: 'x', scheduleId: null, fingerprint: null }], plan);
    assert.deepEqual(result.cancel, ['x']);
    assert.equal(result.schedule.length, 2);
  });

  test('rekonsiliasi murni: input yang sama menghasilkan hasil yang sama', () => {
    const existing = [{ identifier: 'n1', scheduleId: 1, fingerprint: 'lain' }];
    assert.deepEqual(reconcileReminders(existing, plan), reconcileReminders(existing, plan));
  });
});
