/**
 * hooks/useReminderStatus.ts
 *
 * Status pengingat kelas untuk layar Jadwal: apakah izin notifikasi sudah ada,
 * berapa pengingat yang aktif, dan aksi untuk mengaktifkannya.
 *
 * Prinsip:
 * - tidak pernah memunculkan dialog izin sendiri; dialog hanya muncul setelah
 *   pengguna menekan "Aktifkan pengingat" (`enable()`);
 * - selalu membaca ulang izin saat layar kembali fokus, karena pengguna bisa
 *   mengubah izin dari Pengaturan sistem;
 * - kegagalan notifikasi tidak pernah dilempar ke UI sebagai crash;
 * - lima keadaan dibedakan: platform tidak didukung (web), modul native tidak
 *   ada di build, izin belum ada, izin diblokir, dan kegagalan penjadwalan;
 * - status `active` HANYA dipakai setelah sinkronisasi benar-benar berhasil,
 *   sehingga kegagalan tidak pernah tampil sebagai "pengingat aktif".
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { getAllSchedules } from '../db/schedules';
import { getReminderPermissionState, PERMISSION_UNREADABLE_MESSAGE } from '../lib/notifications';
import { enableClassReminders, syncClassReminders } from '../lib/notificationSync';

export type ReminderStatus =
  | { kind: 'checking' }
  /** Izin ada dan pengingat sudah disinkronkan. */
  | { kind: 'active'; activeCount: number }
  /** Izin belum diminta, atau pernah ditolak tapi masih bisa ditanya lagi. */
  | { kind: 'inactive' }
  /** Ditolak permanen: hanya bisa diubah lewat Pengaturan sistem. */
  | { kind: 'blocked' }
  /** Platform tanpa dukungan notifikasi lokal (web). */
  | { kind: 'unsupported' }
  /**
   * Platform didukung, tetapi build yang terpasang tidak memuat modul native
   * `expo-notifications`. Bukan penolakan izin dan tidak bisa diperbaiki dari
   * dalam aplikasi: perlu memasang build baru.
   */
  | { kind: 'unavailable' }
  /** Kegagalan operasional penjadwalan; layak dicoba ulang. */
  | { kind: 'error'; message: string };

export type UseReminderStatusResult = {
  status: ReminderStatus;
  /** True saat dialog izin/sinkronisasi sedang berjalan. */
  busy: boolean;
  /** Meminta izin lalu menyinkronkan pengingat. */
  enable: () => void;
  /** Membaca ulang status tanpa meminta izin. */
  refresh: () => void;
};

export function useReminderStatus(): UseReminderStatusResult {
  const db = useSQLiteContext();
  const [status, setStatus] = useState<ReminderStatus>({ kind: 'checking' });
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function read() {
        try {
          const permission = await getReminderPermissionState();

          if (!permission.supported) {
            if (!cancelled) setStatus({ kind: 'unsupported' });
            return;
          }

          // Modul native tidak termuat: jangan pernah diperlakukan sebagai
          // "izin ditolak" — dialog izinnya tidak akan pernah muncul.
          if (!permission.moduleAvailable) {
            if (!cancelled) setStatus({ kind: 'unavailable' });
            return;
          }

          if (!permission.granted) {
            if (!cancelled) {
              // Pembacaan izin yang gagal bukan "diblokir": izin yang diblokir
              // punya arti sendiri (pengguna menolak permanen), sedangkan ini
              // kegagalan operasional yang layak dicoba ulang.
              if (permission.status === 'error') {
                setStatus({
                  kind: 'error',
                  message: PERMISSION_UNREADABLE_MESSAGE,
                });
              } else {
                setStatus({ kind: permission.canAskAgain ? 'inactive' : 'blocked' });
              }
            }
            return;
          }

          // Izin ada: pastikan notifikasi benar-benar sesuai data terbaru.
          const result = await syncClassReminders(db);
          if (cancelled) return;

          if (result.status === 'permission-denied') {
            setStatus({ kind: 'inactive' });
            return;
          }
          if (result.status === 'module-unavailable') {
            setStatus({ kind: 'unavailable' });
            return;
          }
          if (result.status === 'error') {
            // Penjadwalan gagal: jangan pernah dilaporkan aktif.
            setStatus({ kind: 'error', message: result.message });
            return;
          }
          if (result.status === 'unsupported') {
            setStatus({ kind: 'unsupported' });
            return;
          }

          const schedules = await getAllSchedules(db);
          if (cancelled) return;
          setStatus({ kind: 'active', activeCount: schedules.length });
        } catch (error) {
          if (!cancelled) {
            console.error('[notifikasi] Gagal membaca status pengingat:', error);
            setStatus({
              kind: 'error',
              message: error instanceof Error ? error.message : 'Kesalahan tidak diketahui.',
            });
          }
        }
      }

      read();

      return () => {
        cancelled = true;
      };
    }, [db, token])
  );

  const refresh = useCallback(() => {
    setStatus({ kind: 'checking' });
    setToken((value) => value + 1);
  }, []);

  const enable = useCallback(() => {
    if (busy) return;

    setBusy(true);
    (async () => {
      try {
        const result = await enableClassReminders(db);
        setToken((value) => value + 1);

        // Pembacaan ulang status tetap berjalan lewat `token`, tetapi hasil
        // kegagalan ditampilkan langsung supaya pengguna tidak sempat melihat
        // status lama seolah pengingat sudah aktif.
        if (result.status === 'error') {
          console.error('[notifikasi] Aktifasi pengingat gagal:', result.message);
          setStatus({ kind: 'error', message: result.message });
        } else if (result.status === 'module-unavailable') {
          setStatus({ kind: 'unavailable' });
        }
      } catch (error) {
        console.error('[notifikasi] Aktifasi pengingat gagal:', error);
        setStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Kesalahan tidak diketahui.',
        });
      } finally {
        setBusy(false);
      }
    })();
  }, [busy, db]);

  return { status, busy, enable, refresh };
}
