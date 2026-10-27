import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, spacing, typography } from '../lib/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * Menangkap kegagalan inisialisasi database yang dilempar ulang oleh
 * `<SQLiteProvider>` (perilaku bawaan expo-sqlite) dan menampilkannya apa
 * adanya. Error TIDAK ditelan: pesan asli tetap dicetak ke console oleh
 * `db/database.ts`, dan pesannya ditampilkan di layar.
 */

type Props = {
  children: ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
};

type State = {
  error: Error | null;
};

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[db] Layar gagal dirender setelah inisialisasi database:', error);
  }

  render() {
    const { error } = this.state;
    const { colors, children } = this.props;

    if (!error) {
      return children;
    }

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text.primary }]} accessibilityRole="header">
          Jadwal belum dapat dimuat
        </Text>
        <Text style={[styles.detail, { color: colors.text.secondary }]}>{error.message}</Text>
      </View>
    );
  }
}

export function DatabaseErrorBoundary({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  return <ErrorBoundary colors={colors}>{children}</ErrorBoundary>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.section,
    fontFamily,
  },
  detail: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xs,
  },
});
