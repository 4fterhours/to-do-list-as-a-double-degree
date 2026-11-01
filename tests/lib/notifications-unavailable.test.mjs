/**
 * tests/lib/notifications-unavailable.test.mjs
 *
 * Domain: KLASIFIKASI NOTIFIKASI (D6) — build TANPA modul native.
 *
 * Skenario: aplikasi terpasang di Android/iOS, tetapi build tersebut tidak
 * memuat `expo-notifications` (mis. development build lama). Ini BUKAN
 * "platform tidak didukung" dan BUKAN "izin ditolak".
 *
 * File terpisah dari `notifications-ready.test.mjs` karena `lib/notifications.ts`
 * menyimpan cache kegagalan pemuatan modul; satu proses test = satu keadaan.
 *
 * Kode yang diuji: lib/notifications.ts (asli). Hanya `require` modul native
 * yang dipalsukan, lewat `tests/support/setup.mjs`.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import { setPlatform } from '../support/native/react-native.mjs';
import { state as nativeState } from '../support/native/expo-notifications.mjs';

// Ditetapkan SEBELUM modul produksi dipakai, meniru build yang tidak memuat modul.
nativeState.installed = false;
setPlatform('android');

// Peringatan konsol ditangkap untuk memastikan tidak diulang setiap pemanggilan.
const warnings = [];
const originalWarn = console.warn;
console.warn = (...args) => warnings.push(args.map(String).join(' '));

const notifications = await import('../../lib/notifications.ts');

describe('NOTIFIKASI D6 — modul native tidak ada di build', () => {
  before(() => {
    nativeState.installed = false;
  });

  test('android tanpa modul → keadaan modul "unavailable", bukan "unsupported"', () => {
    setPlatform('android');
    assert.equal(notifications.isNotificationPlatformSupported(), true, 'Android tetap platform yang didukung');
    assert.equal(notifications.getNotificationModuleState(), 'unavailable');
    assert.equal(notifications.getNotifications(), null);
  });

  test('iOS tanpa modul → juga "unavailable"', () => {
    setPlatform('ios');
    assert.equal(notifications.isNotificationPlatformSupported(), true);
    assert.equal(notifications.getNotificationModuleState(), 'unavailable');
    setPlatform('android');
  });

  test('web tetap "unsupported" dan tidak mencoba memuat modul', () => {
    setPlatform('web');
    assert.equal(notifications.isNotificationPlatformSupported(), false);
    assert.equal(notifications.getNotificationModuleState(), 'unsupported');
    assert.equal(notifications.getNotifications(), null);
    setPlatform('android');
  });

  test('status izin: platform didukung, modul tidak tersedia, izin tidak diberikan', async () => {
    setPlatform('android');
    const status = await notifications.getReminderPermissionState();

    assert.equal(status.supported, true);
    assert.equal(status.moduleAvailable, false);
    assert.equal(status.granted, false, 'pengingat TIDAK boleh dianggap aktif');
    assert.equal(status.canAskAgain, false);
    assert.equal(status.status, 'module-unavailable');
  });

  test('permintaan izin tidak memunculkan dialog dan tidak membuat channel', async () => {
    setPlatform('android');
    const before = { channel: nativeState.calls.channel, request: nativeState.calls.permissionRequest };

    const status = await notifications.requestReminderPermission();

    assert.equal(status.status, 'module-unavailable');
    assert.equal(status.moduleAvailable, false);
    assert.equal(nativeState.calls.channel, before.channel, 'channel tidak dibuat tanpa modul');
    assert.equal(nativeState.calls.permissionRequest, before.request, 'dialog izin tidak dipanggil');
  });

  test('channel tidak dapat dipastikan tanpa modul', async () => {
    setPlatform('android');
    assert.equal(await notifications.ensureClassReminderChannel(), false);
    assert.equal(nativeState.channels.length, 0);
  });

  test('notification handler tidak dipasang (tidak melempar)', () => {
    assert.doesNotThrow(() => notifications.configureNotificationHandler());
    assert.equal(nativeState.calls.handler, 0);
  });

  test('peringatan modul hilang hanya dicatat sekali walau dipanggil berulang', () => {
    for (let index = 0; index < 5; index += 1) notifications.getNotificationModuleState();

    const relevant = warnings.filter((line) => line.includes('tidak tersedia di build ini'));
    assert.equal(relevant.length, 1, `peringatan seharusnya sekali, ditemukan ${relevant.length}`);

    console.warn = originalWarn;
  });
});
