import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAllTasks, setTaskCompleted } from '../db/tasks';
import type { Task } from '../db/types';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { breakpoint, fontFamily, geometry, radius, spacing, typography } from '../lib/tokens';
import { formatDeadlineDate, getDeadlineState } from '../lib/time';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { ScreenHeader } from './ScreenHeader';
import { StatusLabel } from './StatusLabel';

/**
 * Daftar seluruh tugas: belum selesai (urut deadline) lalu selesai.
 * Menandai selesai / membuka kembali langsung tersimpan ke SQLite.
 */

type Section = {
  title: string;
  data: Task[];
};

export function TasksScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { state, reload } = useFocusQuery(getAllTasks);

  const horizontalPadding = width < breakpoint.compactWidth ? spacing.md : spacing.lg;

  const tasks = state.status === 'ready' ? state.data : [];
  const pending = tasks.filter((task) => !task.isCompleted);
  const completed = tasks.filter((task) => task.isCompleted);

  const sections: Section[] = [
    ...(pending.length > 0 ? [{ title: 'Belum selesai', data: pending }] : []),
    ...(completed.length > 0 ? [{ title: 'Selesai', data: completed }] : []),
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingBottom: spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <ScreenHeader
              title="Tugas"
              subtitle={
                state.status === 'ready'
                  ? `${pending.length} belum selesai · ${completed.length} selesai`
                  : 'Memuat tugas…'
              }
            />
            {state.status === 'error' ? (
              <ReadError message={state.message} onRetry={reload} />
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => <TaskManageRow task={item} onChanged={reload} />}
        ListEmptyComponent={
          state.status === 'ready' ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                Belum ada tugas.
              </Text>
              <Text style={[styles.emptyCaption, { color: colors.text.secondary }]}>
                Tambahkan tugas agar muncul di layar Hari Ini sesuai deadlinenya.
              </Text>
            </View>
          ) : undefined
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <PrimaryButton
              label="Tambah tugas"
              icon="add"
              onPress={() => router.push('/tugas/baru')}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

function TaskManageRow({ task, onChanged }: { task: Task; onChanged: () => void }) {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const now = new Date();
  const deadline = getDeadlineState(task.deadlineAt, now);

  const toggle = async () => {
    setBusy(true);
    try {
      await setTaskCompleted(db, task.id, !task.isCompleted);
      onChanged();
    } catch (error) {
      console.error('[tugas] Gagal mengubah status tugas:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Pressable
        onPress={() => router.push(`/tugas/${task.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${task.title}. Ketuk untuk mengedit.`}
        style={styles.rowText}
      >
        <Text style={[styles.courseName, { color: colors.text.secondary }]}>
          {task.courseName ?? 'Tugas mandiri'}
        </Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>{task.title}</Text>
        <Text style={[styles.meta, { color: colors.text.secondary }]}>
          {formatDeadlineDate(task.deadlineAt, now)}
        </Text>
      </Pressable>

      <View style={styles.rowActions}>
        {task.isCompleted ? (
          <StatusLabel tone="complete" label="Selesai" />
        ) : (
          <StatusLabel tone={deadline.tone} label={deadline.label} />
        )}

        <Pressable
          onPress={toggle}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={
            task.isCompleted ? `Buka kembali ${task.title}` : `Tandai selesai ${task.title}`
          }
          style={({ pressed }) => [
            styles.toggle,
            {
              borderColor: colors.border,
              backgroundColor: pressed ? colors.surfaceSubtle : 'transparent',
              opacity: busy ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons
            name={task.isCompleted ? 'arrow-undo-outline' : 'checkmark-circle-outline'}
            size={geometry.iconSmall}
            color={colors.accent}
          />
          <Text style={[styles.toggleLabel, { color: colors.text.primary }]}>
            {task.isCompleted ? 'Buka' : 'Selesai'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={styles.errorBox}>
      <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
        Tugas belum dapat dimuat
      </Text>
      <Text style={[styles.emptyCaption, { color: colors.text.secondary }]}>{message}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Coba lagi memuat tugas"
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
  sectionTitle: {
    ...typography.caption,
    fontFamily,
    textTransform: 'uppercase',
    letterSpacing: typography.label.letterSpacing,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    ...typography.caption,
    fontFamily,
  },
  title: {
    ...typography.taskTitle,
    fontFamily,
    marginTop: spacing.xxs,
  },
  meta: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xxs,
  },
  rowActions: {
    alignItems: 'flex-end',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: geometry.touchTarget,
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderWidth: geometry.borderWidth,
    borderRadius: radius.small,
    gap: spacing.xxs,
  },
  toggleLabel: {
    ...typography.caption,
    fontFamily,
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
