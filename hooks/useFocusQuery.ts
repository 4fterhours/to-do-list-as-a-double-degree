/**
 * hooks/useFocusQuery.ts
 *
 * Pembacaan data untuk layar pengelolaan. Data dibaca ulang setiap layar
 * kembali fokus, sehingga perubahan dari form (tambah/edit/hapus) langsung
 * terlihat tanpa memelihara cache sendiri.
 */

import { useFocusEffect } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

export type UseFocusQueryResult<T> = {
  state: QueryState<T>;
  /** Membaca ulang data (dipakai aksi "Coba lagi"). */
  reload: () => void;
};

export function useFocusQuery<T>(
  run: (db: SQLiteDatabase) => Promise<T>
): UseFocusQueryResult<T> {
  const db = useSQLiteContext();
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' });
  const [token, setToken] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        try {
          const data = await run(db);
          if (!cancelled) {
            setState({ status: 'ready', data });
          }
        } catch (error) {
          console.error('[db] Gagal membaca data:', error);
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
      // `run` sengaja tidak masuk dependensi: pemanggil mengirim closure baru
      // setiap render, dan kita hanya ingin membaca ulang saat fokus berubah
      // atau `token` (reload manual) berubah.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, token])
  );

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setToken((value) => value + 1);
  }, []);

  return { state, reload };
}
