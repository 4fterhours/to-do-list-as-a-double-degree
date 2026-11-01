/**
 * tests/lib/validation.test.mjs
 *
 * Domain: VALIDASI FORM.
 *
 * Kode yang diuji: lib/validation.ts (murni). Setiap validator mengembalikan
 * `null` bila valid atau pesan bahasa Indonesia bila tidak.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_COURSE_NAME_LENGTH,
  MAX_REMINDER_MINUTES,
  MAX_ROOM_LENGTH,
  MAX_TASK_TITLE_LENGTH,
  MIN_REMINDER_MINUTES,
  hasErrors,
  normalizeRoom,
  validateClock,
  validateCourseName,
  validateDayOfWeek,
  validateDeadline,
  validateReminderMinutes,
  validateRoom,
  validateScheduleForm,
  validateTaskForm,
  validateTaskTitle,
  validateTimeRange,
} from '../../lib/validation.ts';

describe('VALIDASI — judul dan nama', () => {
  test('judul tugas wajib diisi dan dibatasi panjangnya', () => {
    assert.match(validateTaskTitle(''), /wajib diisi/);
    assert.match(validateTaskTitle('   '), /wajib diisi/);
    assert.equal(validateTaskTitle('Ringkas bab 3'), null);
    assert.equal(validateTaskTitle('x'.repeat(MAX_TASK_TITLE_LENGTH)), null);
    assert.match(validateTaskTitle('x'.repeat(MAX_TASK_TITLE_LENGTH + 1)), /maksimal 140 karakter/);
  });

  test('nama mata kuliah wajib diisi dan dibatasi panjangnya', () => {
    assert.match(validateCourseName(''), /wajib diisi/);
    assert.equal(validateCourseName('Hukum Dagang'), null);
    assert.equal(validateCourseName('  Hukum Dagang  '), null, 'spasi di tepi tidak dihitung');
    assert.equal(validateCourseName('x'.repeat(MAX_COURSE_NAME_LENGTH)), null);
    assert.match(validateCourseName('x'.repeat(MAX_COURSE_NAME_LENGTH + 1)), /maksimal 80 karakter/);
  });

  test('ruang boleh kosong, tetapi dibatasi panjangnya', () => {
    assert.equal(validateRoom(''), null);
    assert.equal(validateRoom('B-204'), null);
    assert.match(validateRoom('x'.repeat(MAX_ROOM_LENGTH + 1)), /maksimal 40 karakter/);
  });

  test('ruang kosong disimpan sebagai NULL', () => {
    assert.equal(normalizeRoom(''), null);
    assert.equal(normalizeRoom('   '), null);
    assert.equal(normalizeRoom('  B-204 '), 'B-204');
  });
});

describe('VALIDASI — jam dan rentang', () => {
  test('format jam harus HH:mm 24 jam', () => {
    for (const valid of ['00:00', '09:45', '13:00', '23:59']) {
      assert.equal(validateClock(valid), null, `${valid} seharusnya valid`);
    }
    for (const invalid of ['', '9:45', '24:00', '10.00', '10:60', '10:5']) {
      assert.match(validateClock(invalid), /format HH:mm/i, `${invalid} seharusnya ditolak`);
    }
  });

  test('jam selesai harus setelah jam mulai', () => {
    assert.equal(validateTimeRange('10:00', '11:40'), null);
    assert.match(validateTimeRange('10:00', '10:00'), /setelah jam mulai/);
    assert.match(validateTimeRange('10:00', '09:00'), /setelah jam mulai/);
    assert.match(validateTimeRange('25:00', '11:00'), /Jam mulai belum benar/);
    assert.match(validateTimeRange('10:00', '11:75'), /Jam selesai belum benar/);
  });

  test('menit pengingat: bilangan bulat 0–1440', () => {
    assert.equal(validateReminderMinutes('0'), null);
    assert.equal(validateReminderMinutes(String(MAX_REMINDER_MINUTES)), null);
    assert.equal(MIN_REMINDER_MINUTES, 0);
    assert.match(validateReminderMinutes(''), /wajib diisi/);
    assert.match(validateReminderMinutes('abc'), /angka bulat/);
    assert.match(validateReminderMinutes('-5'), /angka bulat/);
    assert.match(validateReminderMinutes('15.5'), /angka bulat/);
    assert.match(validateReminderMinutes('1441'), /antara 0 dan 1440/);
  });

  test('hari harus bilangan bulat 0–6', () => {
    for (const day of [0, 1, 6]) assert.equal(validateDayOfWeek(day), null);
    for (const day of [-1, 7, 1.5]) assert.match(validateDayOfWeek(day), /Pilih hari/);
  });
});

describe('VALIDASI — deadline', () => {
  test('deadline harus angka positif yang sah', () => {
    assert.equal(validateDeadline(Date.UTC(2026, 10, 2, 9, 0)), null);
    assert.match(validateDeadline(0), /belum benar/);
    assert.match(validateDeadline(-1), /belum benar/);
    assert.match(validateDeadline(Number.NaN), /belum benar/);
    assert.match(validateDeadline(Number.POSITIVE_INFINITY), /belum benar/);
  });

  test('deadline di masa lalu tetap diterima (tugas boleh dicatat terlambat)', () => {
    assert.equal(validateDeadline(Date.UTC(2020, 0, 1, 0, 0)), null);
  });
});

describe('VALIDASI — gabungan form', () => {
  const nilaiValid = {
    courseName: 'Hukum Dagang',
    dayOfWeek: 1,
    startTime: '10:00',
    endTime: '11:40',
    room: 'B-204',
    reminderMinutes: '15',
  };

  test('form jadwal yang benar tidak menghasilkan error', () => {
    const errors = validateScheduleForm(nilaiValid);
    assert.deepEqual(errors, {});
    assert.equal(hasErrors(errors), false);
  });

  test('form jadwal kosong menandai seluruh field yang wajib', () => {
    const errors = validateScheduleForm({
      courseName: '',
      dayOfWeek: 9,
      startTime: '',
      endTime: '',
      room: '',
      reminderMinutes: '',
    });

    assert.ok(errors.courseName);
    assert.ok(errors.startTime);
    assert.ok(errors.dayOfWeek);
    assert.ok(errors.reminderMinutes);
    assert.equal(errors.room, undefined, 'ruang opsional');
    assert.equal(
      errors.endTime,
      undefined,
      'bila jam mulai sudah salah, kesalahan rentang tidak ditumpuk ke jam selesai'
    );
    assert.equal(hasErrors(errors), true);
  });

  test('jam mulai benar tetapi jam selesai salah → error ditandai di jam selesai', () => {
    const errors = validateScheduleForm({ ...nilaiValid, endTime: '09:00' });
    assert.equal(errors.startTime, undefined);
    assert.match(errors.endTime, /setelah jam mulai/);
  });

  test('form tugas valid tanpa error, judul kosong ditandai', () => {
    assert.deepEqual(validateTaskForm({ title: 'Ringkas', deadlineAt: Date.UTC(2026, 10, 2, 9, 0) }), {});
    const errors = validateTaskForm({ title: '', deadlineAt: 0 });
    assert.ok(errors.title);
    assert.ok(errors.deadlineAt);
    assert.equal(hasErrors(errors), true);
  });
});
