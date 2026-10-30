import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseErrorBoundary } from '../../components/DatabaseErrorBoundary';
import { DATABASE_NAME, initializeDatabase } from '../../db/database';
import { configureNotificationHandler } from '../../lib/notifications';
import { syncClassReminders } from '../../lib/notificationSync';
import { useTheme } from '../../theme/useTheme';

/**
 * Root layout Expo Router.
 * - Tanpa tab navigator (brief 12): Hari Ini adalah route root, sedangkan
 *   pengelolaan jadwal & tugas adalah route bertumpuk (`/jadwal`, `/tugas`)
 *   yang dibuka dari Hari Ini dan ditutup dengan tombol kembali.
 * - Status bar native mengikuti tema perangkat.
 * - Safe area perangkat, bukan tinggi 44 dp tetap (brief 09).
 * - `SQLiteProvider` membuka database persisten dan menjalankan `onInit`
 *   (PRAGMA foreign_keys + migrasi) SEBELUM merender layar, sehingga tidak ada
 *   komponen yang membaca database sebelum skema siap.
 * - `initializeDatabase` diimpor dari modul (referensi stabil) karena
 *   `SQLiteProvider` membandingkan `onInit` dengan referensi.
 * - `ReminderSyncGate` menyelaraskan pengingat kelas dengan SQLite saat
 *   aplikasi siap dan setiap kali aplikasi kembali aktif.
 */
export default function RootLayout() {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <DatabaseErrorBoundary>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
          <ReminderSyncGate />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </SQLiteProvider>
      </DatabaseErrorBoundary>
    </SafeAreaProvider>
  );
}

/**
 * Menyelaraskan notifikasi pengingat kelas tanpa UI.
 *
 * Kapan dijalankan:
 * 1. sekali saat aplikasi siap (database sudah dimigrasikan);
 * 2. setiap aplikasi kembali aktif — menutup kemungkinan pengingat tertinggal
 *    setelah jadwal diubah di sesi lain, atau setelah pengguna mengubah izin
 *    dari Pengaturan sistem.
 *
 * Rekonsiliasi bersifat idempoten, jadi pemanggilan berulang tidak pernah
 * menghasilkan notifikasi ganda. Tidak ada dialog izin di sini: bila izin
 * belum ada, sinkronisasi hanya melapor "permission-denied" dan UI yang
 * menawarkan tombol aktifasi.
 */
function ReminderSyncGate() {
  const db = useSQLiteContext();

  useEffect(() => {
    configureNotificationHandler();
    void syncClassReminders(db);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void syncClassReminders(db);
      }
    });

    return () => subscription.remove();
  }, [db]);

  return null;
}
