import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAllSchedules } from '../db/schedules';
import type { Schedule } from '../db/types';
import { useFocusQuery } from '../hooks/useFocusQuery';
import {
  breakpoint,
  fontFamily,
  geometry,
  radius,
  spacing,
  typography,
} from '../lib/tokens';
import { formatTimeRange } from '../lib/time';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { ReminderStatusCard } from './ReminderStatusCard';
import { ScreenHeader } from './ScreenHeader';

/**
 * Daftar seluruh jadwal mingguan, dikelompokkan per hari (Senin → Minggu).
 * Ketuk satu baris untuk mengedit. Tidak ada data contoh di layar ini: isinya
 * selalu berasal dari SQLite.
 */

const WEEK_LABELS: Record<number, string> = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
};

export function SchedulesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { state, reload } = useFocusQuery(getAllSchedules);

  const horizontalPadding = width < breakpoint.compactWidth ? spacing.md : spacing.lg;

  const schedules = state.status === 'ready' ? state.data : [];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <FlatList
        data={schedules}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingBottom: spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <ScreenHeader
              title="Jadwal"
              subtitle={
                state.status === 'ready'
                  ? `${schedules.length} entri jadwal mingguan`
                  : 'Memuat jadwal…'
              }
            />
            <ReminderStatusCard />
            {state.status === 'error' ? (
              <ReadError message={state.message} onRetry={reload} />
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => {
          const showDayHeader =
            index === 0 || schedules[index - 1].dayOfWeek !== item.dayOfWeek;

          return (
            <View>
              {showDayHeader ? (
                <Text style={[styles.dayHeader, { color: colors.text.secondary }]}>
                  {WEEK_LABELS[item.dayOfWeek]}
                </Text>
              ) : null}
              <ScheduleRow schedule={item} />
            </View>
          );
        }}
        ListEmptyComponent={
          state.status === 'ready' ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                Belum ada jadwal.
              </Text>
              <Text style={[styles.emptyCaption, { color: colors.text.secondary }]}>
                Tambahkan kelas pertama agar muncul di layar Hari Ini.
              </Text>
            </View>
          ) : undefined
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <PrimaryButton
              label="Tambah jadwal"
              icon="add"
              onPress={() => router.push('/jadwal/baru')}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

function ScheduleRow({ schedule }: { schedule: Schedule }) {
  const { colors } = useTheme();
  const router = useRouter();

  const room = schedule.room ?? 'Ruang belum ditentukan';

  return (
    <Pressable
      onPress={() => router.push(`/jadwal/${schedule.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${schedule.courseName}, ${WEEK_LABELS[schedule.dayOfWeek]}, ${formatTimeRange(
        schedule.startTime,
        schedule.endTime
      )}, ${room}. Ketuk untuk mengedit.`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfaceSubtle : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.courseName, { color: colors.text.primary }]}>
          {schedule.courseName}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.text.secondary }]}>
          {formatTimeRange(schedule.startTime, schedule.endTime)} · {room}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.text.muted }]}>
          Pengingat {schedule.reminderMinutes} menit sebelum
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={geometry.iconSmall} color={colors.text.muted} />
    </Pressable>
  );
}

function ReadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={styles.errorBox}>
      <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
        Jadwal belum dapat dimuat
      </Text>
      <Text style={[styles.errorDetail, { color: colors.text.secondary }]}>{message}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Coba lagi memuat jadwal"
        style={[styles.retry, { borderColor: colors.border }]}
      >
        <Text style={[styles.retryText, { color: colors.accent }]}>Coba lagi</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  dayHeader: {
    ...typography.caption,
    fontFamily,
    textTransform: 'uppercase',
    letterSpacing: typography.label.letterSpacing,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: geometry.borderWidth,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  courseName: {
    ...typography.bodyStrong,
    fontFamily,
  },
  rowMeta: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xxs,
  },
  footer: {
    marginTop: spacing.lg,
  },
  empty: {
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.bodyStrong,
    fontFamily,
  },
  emptyCaption: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xxs,
  },
  errorBox: {
    paddingVertical: spacing.md,
  },
  errorTitle: {
    ...typography.bodyStrong,
    fontFamily,
  },
  errorDetail: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xxs,
  },
  retry: {
    alignSelf: 'flex-start',
    minHeight: geometry.touchTarget,
    justifyContent: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: geometry.borderWidth,
    borderRadius: radius.small,
  },
  retryText: {
    ...typography.bodyStrong,
    fontFamily,
  },
});
