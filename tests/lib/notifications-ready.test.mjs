/**
 * tests/lib/notifications-ready.test.mjs
 *
 * Domain: KLASIFIKASI NOTIFIKASI (D6) — modul native TERSEDIA.
 *
 * Menguji seluruh keadaan yang bisa dibedakan setelah modul termuat: izin
 * diberikan, izin belum/tidak diberikan, izin diblokir permanen, dan kegagalan
 * membaca status izin. Ditambah channel Android, urutan channel-sebelum-izin
 * (AC-D2), serta handler notifikasi saat aplikasi terbuka.
 *
 * Kode yang diuji: lib/notifications.ts (asli).
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { reset, state as nativeState, fault, clearFaults } from '../support/native/expo-notifications.mjs';
import { setPlatform } from '../support/native/react-native.mjs';

nativeState.installed = true;
setPlatform('android');

const notifications = await import('../../lib/notifications.ts');

const resetAll = () => {
  reset();
  nativeState.installed = true;
  clearFaults();
  setPlatform('android');
};

describe('NOTIFIKASI D6 — modul native tersedia', () => {
  beforeEach(resetAll);

  test('android dengan modul → keadaan "ready"', () => {
    assert.equal(notifications.getNotificationModuleState(), 'ready');
    assert.ok(notifications.getNotifications(), 'modul dapat dimuat');
  });

  test('izin diberikan → granted dan moduleAvailable', async () => {
    nativeState.permission = { granted: true, canAskAgain: true, status: 'granted' };
    const status = await notifications.getReminderPermissionState();

    assert.equal(status.supported, true);
    assert.equal(status.moduleAvailable, true);
    assert.equal(status.granted, true);
    assert.equal(status.canAskAgain, true);
    assert.equal(status.status, 'granted');
  });

  test('izin belum diminta → granted false, masih bisa ditanya lagi', async () => {
    nativeState.permission = { granted: false, canAskAgain: true, status: 'undetermined' };
    const status = await notifications.getReminderPermissionState();

    assert.equal(status.moduleAvailable, true);
    assert.equal(status.granted, false);
    assert.equal(status.canAskAgain, true);
    assert.equal(status.status, 'undetermined');
  });

  test('izin ditolak permanen → canAskAgain false', async () => {
    nativeState.permission = { granted: false, canAskAgain: false, status: 'denied' };
    const status = await notifications.getReminderPermissionState();

    assert.equal(status.granted, false);
    assert.equal(status.canAskAgain, false);
    assert.equal(status.status, 'denied');
  });

  test('gagal membaca izin → status "error", tetap dianggap modul tersedia (bukan unsupported)', async () => {
    fault('permissionRead', 'pembacaan izin gagal');
    const status = await notifications.getReminderPermissionState();

    assert.equal(status.supported, true);
    assert.equal(status.moduleAvailable, true, 'modul ada; masalahnya pembacaan, bukan modul');
    assert.equal(status.granted, false, 'jangan pernah dianggap aktif saat pembacaan gagal');
    assert.equal(status.status, 'error');
  });

  test('channel Android dibuat dengan id, nama, importance DEFAULT, dan getaran', async () => {
    assert.equal(await notifications.ensureClassReminderChannel(), true);

    assert.equal(nativeState.channels.length, 1);
    const [channel] = nativeState.channels;
    assert.equal(channel.identifier, 'class-reminders');
    assert.equal(channel.options.name, 'Pengingat Kuliah');
    assert.equal(channel.options.importance, 3, 'AndroidImportance.DEFAULT');
    assert.equal(channel.options.enableVibrate, true);
  });

  test('permintaan izin membuat channel LEBIH DULU, lalu bertanya (AC-D2)', async () => {
    nativeState.permission = { granted: true, canAskAgain: false, status: 'granted' };
    const status = await notifications.requestReminderPermission();

    assert.equal(status.granted, true);
    assert.deepEqual(nativeState.order, ['channel', 'permissionRequest']);
    assert.deepEqual(nativeState.lastRequestOptions, {
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
  });

  test('channel gagal dibuat: izin tetap diminta dan hasilnya jujur', async () => {
    fault('channel', 'channel ditolak sistem');
    const status = await notifications.requestReminderPermission();

    assert.equal(status.granted, true);
    assert.equal(nativeState.channels.length, 0);
  });

  test('permintaan izin gagal → status "error" dan tidak dianggap diberikan', async () => {
    fault('permissionRequest', 'dialog izin gagal');
    const status = await notifications.requestReminderPermission();

    assert.equal(status.granted, false);
    assert.equal(status.moduleAvailable, true);
    assert.equal(status.status, 'error');
  });

  test('iOS tidak membuat channel (channel hanya konsep Android)', async () => {
    setPlatform('ios');
    assert.equal(await notifications.ensureClassReminderChannel(), false);
    assert.equal(nativeState.channels.length, 0);
    setPlatform('android');
  });

  test('web tidak didukung: tidak ada pembacaan izin sama sekali', async () => {
    setPlatform('web');
    assert.equal(notifications.getNotificationModuleState(), 'unsupported');
    const status = await notifications.getReminderPermissionState();
    assert.equal(status.supported, false);
    assert.equal(status.status, 'unsupported');
    assert.equal(nativeState.calls.permissionRead, 0);
    setPlatform('android');
  });

  test('handler foreground dipasang sekali dan menampilkan banner tanpa badge', async () => {
    notifications.configureNotificationHandler();
    notifications.configureNotificationHandler();

    assert.equal(nativeState.calls.handler, 1, 'tidak dipasang berulang');

    const shown = await nativeState.handler.handleNotification();
    assert.equal(shown.shouldShowBanner, true);
    assert.equal(shown.shouldShowList, true);
    assert.equal(shown.shouldPlaySound, true);
    assert.equal(shown.shouldSetBadge, false);
  });
});
