/**
 * tests/lib/time.test.mjs
 *
 * Domain: PENGOLAHAN WAKTU (lokal).
 *
 * Kode yang diuji: lib/time.ts (murni, tanpa React Native).
 * Semua tanggal dibuat lewat konstruktor lokal `new Date(y, m, d, h, m)`
 * sehingga hasilnya tidak bergantung pada zona waktu mesin yang menjalankan
 * test — perilaku yang diuji adalah perilaku aplikasi, bukan perilaku TZ.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  MINUTE_MS,
  HOUR_MS,
  DAY_MS,
  ceilMinutes,
  clockToDisplay,
  clockToMinutes,
  combineLocalDate,
  dateKey,
  dayOffset,
  formatDeadlineDate,
  formatDuration,
  formatLongDate,
  formatTimeRange,
  getClassTiming,
  getDeadlineState,
  getRemainingClasses,
  minutesToClock,
  startOfLocalDay,
  toSpokenDeadline,
  toSpokenTime,
} from '../../lib/time.ts';

const SENIN_26_OKT_2026_10_00 = new Date(2026, 9, 26, 10, 0, 0, 0);

describe('WAKTU — jam dan format', () => {
  test('konversi HH:mm dua arah', () => {
    assert.equal(clockToMinutes('00:00'), 0);
    assert.equal(clockToMinutes('09:45'), 585);
    assert.equal(clockToMinutes('23:59'), 1439);
    assert.equal(minutesToClock(0), '00.00');
    assert.equal(minutesToClock(585), '09.45');
    assert.equal(minutesToClock(1439), '23.59');
  });

  test('format tampilan memakai gaya Indonesia (titik, bukan titik dua)', () => {
    assert.equal(clockToDisplay('10:00'), '10.00');
    assert.equal(clockToDisplay('07:05'), '07.05');
    assert.equal(formatTimeRange('10:00', '11:40'), '10.00 – 11.40');
    assert.equal(toSpokenTime('10:00'), 'pukul 10.00');
    assert.equal(toSpokenTime('07:05'), 'pukul 07.05');
  });

  test('tanggal panjang berbahasa Indonesia', () => {
    assert.equal(formatLongDate(SENIN_26_OKT_2026_10_00), 'Senin, 26 Oktober 2026');
  });
});

describe('WAKTU — hari, minggu, dan pergantiannya', () => {
  test('startOfLocalDay membuang jam', () => {
    const start = startOfLocalDay(new Date(2026, 9, 26, 23, 59, 59, 999));
    assert.equal(start.getHours(), 0);
    assert.equal(start.getMinutes(), 0);
    assert.equal(dateKey(start), '2026-10-26');
  });

  test('pergantian hari terdeteksi dari selisih hari kalender', () => {
    const sebelumTengahMalam = new Date(2026, 9, 26, 23, 59);
    const sesudahTengahMalam = new Date(2026, 9, 27, 0, 1);

    assert.equal(dayOffset(sesudahTengahMalam, sebelumTengahMalam), 1);
    assert.equal(dayOffset(sebelumTengahMalam, sesudahTengahMalam), -1);
    assert.equal(dayOffset(sebelumTengahMalam, sebelumTengahMalam), 0);
    assert.notEqual(dateKey(sebelumTengahMalam), dateKey(sesudahTengahMalam));
  });

  test('pergantian minggu: Minggu → Senin tetap selisih satu hari', () => {
    const minggu = new Date(2026, 10, 1, 22, 0); // 1 Nov 2026 = Minggu
    const senin = new Date(2026, 10, 2, 7, 0); // 2 Nov 2026 = Senin

    assert.equal(minggu.getDay(), 0);
    assert.equal(senin.getDay(), 1);
    assert.equal(dayOffset(senin, minggu), 1);
    assert.equal(dayOffset(minggu, senin), -1);
  });

  test('pergeseran ganda tetap dihitung per hari kalender', () => {
    const sekarang = new Date(2026, 9, 26, 10, 0);
    const mingguLalu = new Date(2026, 9, 19, 10, 0);
    assert.equal(dayOffset(mingguLalu, sekarang), -7);
  });

  test('combineLocalDate memakai tanggal lokal dan jam dinding', () => {
    const hasil = combineLocalDate(new Date(2026, 9, 26, 15, 30), '08:15');
    assert.equal(hasil.getFullYear(), 2026);
    assert.equal(hasil.getMonth(), 9);
    assert.equal(hasil.getDate(), 26);
    assert.equal(hasil.getHours(), 8);
    assert.equal(hasil.getMinutes(), 15);
  });
});

describe('WAKTU — status kelas hari ini', () => {
  const kelas = { startTime: '10:00', endTime: '11:40' };

  test('kelas belum dimulai → upcoming', () => {
    const timing = getClassTiming(kelas, new Date(2026, 9, 26, 9, 59));
    assert.equal(timing.status, 'upcoming');
    assert.equal(timing.startAt.getHours(), 10);
    assert.equal(timing.endAt.getHours(), 11);
  });

  test('kelas sedang berlangsung → ongoing (termasuk tepat saat mulai)', () => {
    assert.equal(getClassTiming(kelas, new Date(2026, 9, 26, 10, 0)).status, 'ongoing');
    assert.equal(getClassTiming(kelas, new Date(2026, 9, 26, 11, 39)).status, 'ongoing');
  });

  test('kelas sudah selesai → ended (termasuk tepat saat selesai)', () => {
    assert.equal(getClassTiming(kelas, new Date(2026, 9, 26, 11, 40)).status, 'ended');
    assert.equal(getClassTiming(kelas, new Date(2026, 9, 26, 23, 0)).status, 'ended');
  });

  test('kelas berikutnya = kelas pertama yang belum selesai', () => {
    const jadwal = [
      { title: 'Pagi', startTime: '07:00', endTime: '08:40' },
      { title: 'Siang', startTime: '10:00', endTime: '11:40' },
      { title: 'Sore', startTime: '15:00', endTime: '16:40' },
    ];
    const sekarang = new Date(2026, 9, 26, 9, 0);

    const tersisa = getRemainingClasses(jadwal, sekarang);
    assert.deepEqual(tersisa.map((item) => item.title), ['Siang', 'Sore']);
    assert.equal(tersisa[0].title, 'Siang');
  });

  test('jumlah kelas tersisa menghitung kelas yang sedang berlangsung', () => {
    const jadwal = [
      { startTime: '07:00', endTime: '08:40' },
      { startTime: '10:00', endTime: '11:40' },
      { startTime: '15:00', endTime: '16:40' },
    ];

    assert.equal(getRemainingClasses(jadwal, new Date(2026, 9, 26, 6, 0)).length, 3);
    assert.equal(getRemainingClasses(jadwal, new Date(2026, 9, 26, 10, 30)).length, 2);
    assert.equal(getRemainingClasses(jadwal, new Date(2026, 9, 26, 17, 0)).length, 0);
  });
});

describe('WAKTU — deadline', () => {
  const sekarang = new Date(2026, 9, 26, 12, 0);
  const kemarin = new Date(2026, 9, 25, 23, 59).getTime();
  const hariIni = new Date(2026, 9, 26, 23, 59).getTime();
  const besok = new Date(2026, 9, 27, 9, 0).getTime();
  const bulanDepan = new Date(2026, 10, 10, 9, 0).getTime();

  test('label tanggal relatif untuk kemarin, hari ini, dan besok', () => {
    assert.equal(formatDeadlineDate(kemarin, sekarang), 'Kemarin, 23.59');
    assert.equal(formatDeadlineDate(hariIni, sekarang), 'Hari ini, 23.59');
    assert.equal(formatDeadlineDate(besok, sekarang), 'Besok, 09.00');
    assert.equal(formatDeadlineDate(bulanDepan, sekarang), '10 November, 09.00');
  });

  test('versi screen reader memakai kalimat, bukan singkatan', () => {
    assert.equal(toSpokenDeadline(kemarin, sekarang), 'kemarin pukul 23.59');
    assert.equal(toSpokenDeadline(hariIni, sekarang), 'hari ini pukul 23.59');
    assert.equal(toSpokenDeadline(besok, sekarang), 'besok pukul 09.00');
  });

  test('tahun ditampilkan hanya bila berbeda tahun', () => {
    const tahunDepan = new Date(2027, 0, 5, 8, 0).getTime();
    assert.equal(formatDeadlineDate(tahunDepan, sekarang), '5 Januari 2027, 08.00');
  });

  test('tone deadline: terlambat, ≤ 24 jam, > 24 jam', () => {
    const lewat = getDeadlineState(sekarang.getTime() - 9 * HOUR_MS - 20 * MINUTE_MS, sekarang);
    assert.equal(lewat.tone, 'overdue');
    assert.equal(lewat.label, 'Terlambat 9 jam');

    const hampir = getDeadlineState(sekarang.getTime() + 2 * HOUR_MS, sekarang);
    assert.equal(hampir.tone, 'deadline');
    assert.equal(hampir.label, 'Sisa 2 jam');

    const jauh = getDeadlineState(sekarang.getTime() + 3 * DAY_MS, sekarang);
    assert.equal(jauh.tone, 'info');
    assert.equal(jauh.label, 'Sisa 3 hari');
  });

  test('tepat di batas 24 jam masih dianggap mendesak', () => {
    const state = getDeadlineState(sekarang.getTime() + DAY_MS, sekarang);
    assert.equal(state.tone, 'deadline');
    assert.equal(state.label, 'Sisa 24 jam');
  });
});

describe('WAKTU — durasi', () => {
  test('pembulatan menit ke atas', () => {
    assert.equal(ceilMinutes(0), 0);
    assert.equal(ceilMinutes(MINUTE_MS), 1);
    assert.equal(ceilMinutes(MINUTE_MS + 1), 2);
  });

  test('format durasi bahasa Indonesia', () => {
    assert.equal(formatDuration(0), 'kurang dari 1 menit');
    assert.equal(formatDuration(40), '40 menit');
    assert.equal(formatDuration(80), '1 jam 20 menit');
    assert.equal(formatDuration(120), '2 jam');
  });
});
