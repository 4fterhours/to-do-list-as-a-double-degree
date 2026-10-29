import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { Schedule } from '../db/types';
import { fontFamily, geometry, radius, spacing, tabularNumbers, typography } from '../lib/tokens';
import {
  ceilMinutes,
  clockToDisplay,
  formatDuration,
  formatTimeRange,
  getClassTiming,
  toSpokenTime,
} from '../lib/time';
import { useTheme } from '../theme/useTheme';

/**
 * Kartu kelas berikutnya / kelas yang sedang berlangsung (brief 08).
 *
 * - background class.background, border class.border 1, radius.card, padding lg
 * - overline label, judul course, jam time (tabular), ruang caption + iconSmall
 * - footer countdown dipisah divider class.border, padding atas md, angka bodyStrong
 *
 * `schedule === null` berarti tidak ada kelas tersisa hari ini → state brief 10:
 * "Kelas hari ini selesai.", tanpa waktu, ruang, dan countdown.
 */

type Props = {
  schedule: Schedule | null;
  now: Date;
};

export function NextClassCard({ schedule, now }: Props) {
  const { colors } = useTheme();

  if (!schedule) {
    return (
      <View
        style={[
          styles.cardBase,
          { backgroundColor: colors.class.background, borderColor: colors.class.border },
        ]}
        accessible
        accessibilityLabel="Kelas hari ini selesai. Tidak ada jadwal lagi untuk hari ini."
      >
        <Text style={[styles.overline, { color: colors.class.text }]}>Hari ini</Text>
        <Text style={[styles.course, { color: colors.class.text }]}>Kelas hari ini selesai.</Text>
        <Text style={[styles.emptyNote, { color: colors.class.text }]}>
          Jadwal berikutnya muncul sesuai hari kuliah.
        </Text>
      </View>
    );
  }

  const { status, startAt } = getClassTiming(schedule, now);
  const isOngoing = status === 'ongoing';

  // Kelas berlangsung tidak pernah menampilkan hitung mundur negatif (brief 10):
  // footernya berisi jam selesai. Countdown hanya untuk kelas yang belum mulai.
  const minutesUntilStart = Math.max(0, ceilMinutes(startAt.getTime() - now.getTime()));
  const footerCaption = isOngoing ? 'Selesai' : 'Mulai dalam';
  const footerValue = isOngoing
    ? clockToDisplay(schedule.endTime)
    : formatDuration(minutesUntilStart);

  const spokenFooter = isOngoing
    ? `selesai ${toSpokenTime(schedule.endTime)}`
    : `mulai dalam ${formatDuration(minutesUntilStart)}`;
  const spokenRoom = schedule.room ? `ruang ${schedule.room}` : 'ruang belum ditentukan';

  return (
    <View
      style={[
        styles.cardBase,
        styles.classCardMinHeight,
        { backgroundColor: colors.class.background, borderColor: colors.class.border },
      ]}
      accessible
      accessibilityLabel={[
        isOngoing ? 'Sedang berlangsung' : 'Kelas berikutnya',
        schedule.courseName,
        `${toSpokenTime(schedule.startTime)} sampai ${toSpokenTime(schedule.endTime)}`,
        spokenRoom,
        spokenFooter,
      ].join(', ')}
    >
      <Text style={[styles.overline, { color: colors.class.text }]}>
        {isOngoing ? 'Sedang berlangsung' : 'Kelas berikutnya'}
      </Text>

      <Text style={[styles.course, { color: colors.class.text }]}>{schedule.courseName}</Text>

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={geometry.icon} color={colors.class.text} />
        <Text style={[styles.metaTime, { color: colors.class.text }]}>
          {formatTimeRange(schedule.startTime, schedule.endTime)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={geometry.iconSmall} color={colors.class.text} />
        <Text style={[styles.metaCaption, { color: colors.class.text }]}>
          {schedule.room ?? 'Ruang belum ditentukan'}
        </Text>
      </View>

      {/* Mendorong footer ke dasar kartu agar tinggi minimum tetap rapi. */}
      <View style={styles.footerSpacer} />

      <View style={[styles.footer, { borderTopColor: colors.class.border }]}>
        <Text style={[styles.footerCaption, { color: colors.class.text }]}>{footerCaption}</Text>
        <Text style={[styles.footerValue, { color: colors.class.text }]}>{footerValue}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Dasar kartu, dipakai kedua kondisi (brief 08: radius.card, padding lg).
  cardBase: {
    borderRadius: radius.card,
    borderWidth: geometry.borderWidth,
    padding: spacing.lg,
  },
  // Hanya kartu berisi kelas yang dikunci tinggi minimumnya, agar footer
  // countdown selalu duduk di dasar kartu (brief 03: kartu minimum 252 dp).
  classCardMinHeight: {
    minHeight: geometry.heroMinimumHeight,
  },
  overline: {
    ...typography.label,
    fontFamily,
    textTransform: 'uppercase',
  },
  course: {
    ...typography.course,
    fontFamily,
    marginTop: spacing.xs,
  },
  emptyNote: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  metaTime: {
    ...typography.time,
    ...tabularNumbers,
    fontFamily,
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  metaCaption: {
    ...typography.caption,
    fontFamily,
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  footerSpacer: {
    flexGrow: 1,
  },
  footer: {
    borderTopWidth: geometry.dividerWidth,
    paddingTop: spacing.md,
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  footerCaption: {
    ...typography.caption,
    fontFamily,
  },
  footerValue: {
    ...typography.bodyStrong,
    ...tabularNumbers,
    fontFamily,
    marginLeft: spacing.xxs,
  },
});
