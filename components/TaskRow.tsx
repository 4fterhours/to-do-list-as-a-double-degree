import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { Task } from '../db/types';
import { fontFamily, geometry, spacing, typography } from '../lib/tokens';
import { formatDeadlineDate, getDeadlineState, toSpokenDeadline } from '../lib/time';
import { useTheme } from '../theme/useTheme';
import { StatusLabel } from './StatusLabel';

/**
 * Baris tugas (brief 08): course caption, judul taskTitle, tanggal caption
 * dengan calendar-outline, badge status di kanan.
 *
 * Tanpa kartu, tanpa border, tanpa elevasi — hanya padding vertikal md
 * (brief 05 & 03). Judul panjang membungkus tanpa ellipsis.
 */

type Props = {
  task: Task;
  now: Date;
};

export function TaskRow({ task, now }: Props) {
  const { colors } = useTheme();
  const deadline = getDeadlineState(task.deadlineAt, now);

  const course = task.courseName ?? 'Tugas mandiri';
  const date = formatDeadlineDate(task.deadlineAt, now);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${task.title}, ${course}, ${toSpokenDeadline(task.deadlineAt, now)}, ${deadline.label}`}
    >
      <View style={styles.textColumn}>
        <Text style={[styles.course, { color: colors.text.secondary }]}>{course}</Text>

        <Text style={[styles.title, { color: colors.text.primary }]}>{task.title}</Text>

        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={geometry.iconSmall}
            color={colors.text.secondary}
          />
          <Text style={[styles.date, { color: colors.text.secondary }]}>{date}</Text>
        </View>
      </View>

      <View style={styles.badgeColumn}>
        <StatusLabel tone={deadline.tone} label={deadline.label} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  textColumn: {
    flex: 1,
    marginRight: spacing.sm,
  },
  course: {
    ...typography.caption,
    fontFamily,
  },
  title: {
    ...typography.taskTitle,
    fontFamily,
    marginTop: spacing.xxs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  date: {
    ...typography.caption,
    fontFamily,
    marginLeft: spacing.xxs,
    flexShrink: 1,
  },
  badgeColumn: {
    flexShrink: 0,
  },
});
