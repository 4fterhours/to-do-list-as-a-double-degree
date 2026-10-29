/**
 * hooks/useTodayData.ts
 *
 * Menghubungkan layar Hari Ini dengan lapisan data di `db/`. Komponen UI tidak
 * menulis SQL sendiri.
 *
 * Perilaku waktu (brief 11 & instruksi Tahap 3):
 * - Jam lokal perangkat dipakai untuk memilih hari jadwal (`Date.getDay()`).
 * - `now` diperbarui tiap 30 detik agar countdown ikut berjalan; countdown
 *   sendiri dibulatkan ke atas per menit.
 * - Data dibaca ulang saat aplikasi kembali aktif dan saat tanggal lokal
 *   berganti (pergantian hari).
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getSchedulesForDay } from '../db/schedules';
import { getPendingTasks } from '../db/tasks';
import type { Schedule, Task } from '../db/types';
import { dateKey } from '../lib/time';

/** Interval pembaruan jam. Cukup rapat untuk countdown per menit. */
const TICK_MS = 30_000;

export type TodayData = {
  schedules: Schedule[];
  tasks: Task[];
};

export type TodayDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: TodayData };

export type UseTodayDataResult = {
  now: Date;
  state: TodayDataState;
  /** Membaca ulang data dari database (dipakai aksi "Coba lagi"). */
  reload: () => void;
};

export function useTodayData(): UseTodayDataResult {
  const db = useSQLiteContext();

  const [now, setNow] = useState(() => new Date());
  const [state, setState] = useState<TodayDataState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  // Kunci tanggal lokal: berubah hanya saat pergantian hari.
  const todayKey = dateKey(now);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Hari diambil dari jam saat query dijalankan, bukan dari `now` state,
        // agar pergantian hari tidak memakai tanggal yang sudah basi.
        const dayOfWeek = new Date().getDay();

        const [schedules, tasks] = await Promise.all([
          getSchedulesForDay(db, dayOfWeek),
          getPendingTasks(db),
        ]);

        if (!cancelled) {
          setState({ status: 'ready', data: { schedules, tasks } });
        }
      } catch (error) {
        console.error('[today] Gagal membaca data jadwal:', error);
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Kesalahan tidak diketahui.',
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [db, todayKey, reloadToken]);

  // Jam berjalan: countdown dan status kelas ikut diperbarui.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  // Kembali ke layar Hari Ini (mis. setelah menyimpan jadwal/tugas di layar
  // lain): baca ulang dari SQLite agar tampilan mengikuti data terbaru.
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      setReloadToken((token) => token + 1);
    }, [])
  );

  // Kembali aktif: segarkan jam dan data (mis. perangkat tidur semalaman).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setNow(new Date());
        setReloadToken((token) => token + 1);
      }
    });

    return () => subscription.remove();
  }, []);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setReloadToken((token) => token + 1);
  }, []);

  return { now, state, reload };
}
