import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseErrorBoundary } from '../../components/DatabaseErrorBoundary';
import { DATABASE_NAME, initializeDatabase } from '../../db/database';
import { useTheme } from '../../theme/useTheme';

/**
 * Root layout Expo Router.
 * - Satu route saja (`index`), tanpa tab navigator (brief 13).
 * - Status bar native mengikuti tema perangkat.
 * - Safe area perangkat, bukan tinggi 44 dp tetap (brief 09).
 * - `SQLiteProvider` membuka database persisten dan menjalankan `onInit`
 *   (PRAGMA foreign_keys + migrasi) SEBELUM merender layar, sehingga tidak ada
 *   komponen yang membaca database sebelum skema siap.
 * - `initializeDatabase` diimpor dari modul (referensi stabil) karena
 *   `SQLiteProvider` membandingkan `onInit` dengan referensi.
 */
export default function RootLayout() {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <DatabaseErrorBoundary>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
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
