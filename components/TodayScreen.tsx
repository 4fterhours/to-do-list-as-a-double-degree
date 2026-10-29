import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Schedule } from '../db/types';
import { useTodayData } from '../hooks/useTodayData';
import {
  breakpoint,
  fontFamily,
  geometry,
  radius,
  spacing,
  typography,
} from '../lib/tokens';
import { formatLongDate, getRemainingClasses } from '../lib/time';
import { useTheme } from '../theme/useTheme';
import { NextClassCard } from './NextClassCard';
import { RemainingClasses } from './RemainingClasses';
import { TaskRow } from './TaskRow';

/**
 * Layar Hari Ini (brief 02 & 03).
 *
 * Satu FlatList memuat header (judul + tanggal + dua tautan pengelolaan),
 * kartu kelas, ringkasan sisa kelas, judul seksi tugas, lalu baris-baris tugas
 * (brief 13). Area konten boleh digulir. Layar ini tetap informatif: tidak ada
 * tab, form, atau tombol hapus/ubah di sini — CRUD dilakukan di layar
 * `/jadwal` dan `/tugas` yang dibuka dari tautan di bawah tanggal.
 */
export function TodayScreen() {
  const { colors } = useTheme();
  const { now, state, reload } = useTodayData();
  const { width } = useWindowDimensions();

  // Brief 09: padding 24 dp; di bawah 360 dp menjadi 16 dp.
  const horizontalPadding = width < breakpoint.compactWidth ? spacing.md : spacing.lg;
  const contentStyle = { paddingHorizontal: horizontalPadding, paddingBottom: spacing.xxl };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <FlatList
        data={state.status === 'ready' ? state.data.tasks : []}
        keyExtractor={(task) => String(task.id)}
        renderItem={({ item }) => <TaskRow task={item} now={now} />}
        contentContainerStyle={contentStyle}
        ListHeaderComponent={
          <TodayHeader now={now}>
            {state.status === 'ready' ? (
              <ReadyContent schedules={state.data.schedules} now={now} />
            ) : null}
            {state.status === 'loading' ? <ContentSkeleton /> : null}
            {state.status === 'error' ? (
              <ReadErrorMessage message={state.message} onRetry={reload} />
            ) : null}
          </TodayHeader>
        }
        ListEmptyComponent={state.status === 'ready' ? <NoTasks /> : undefined}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------------- */
/* Header                                                                     */
/* ------------------------------------------------------------------------- */

function TodayHeader({ now, children }: { now: Date; children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <View>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text.primary }]} accessibilityRole="header">
          Hari Ini
        </Text>
        {/* Titik mengikuti warna aksen, bukan logo (brief 01). */}
        <View style={[styles.accentDot, { backgroundColor: colors.accent }]} />
      </View>

      <Text style={[styles.date, { color: colors.text.secondary }]}>{formatLongDate(now)}</Text>

      <ManageLinks />

      <View style={styles.headerGap} />

      {children}
    </View>
  );
}

/* ------------------------------------------------------------------------- */
/* Akses ke pengelolaan data                                                  */
/* ------------------------------------------------------------------------- */

/**
 * Dua pintu masuk ke pengelolaan: jadwal dan tugas. Ditempatkan tepat di bawah
 * tanggal agar mudah ditemukan tanpa menambah navigasi bawah (brief 12), dan
 * tetap memakai token (surface, border, radius.small, touchTarget 48 dp).
 */
function ManageLinks() {
  const { colors } = useTheme();
  const router = useRouter();

  const links = [
    { label: 'Jadwal', icon: 'calendar-outline' as const, href: '/jadwal' as const },
    { label: 'Tugas', icon: 'list-outline' as const, href: '/tugas' as const },
  ];

  return (
    <View style={styles.linkRow}>
      {links.map((link) => (
        <Pressable
          key={link.href}
          onPress={() => router.push(link.href)}
          accessibilityRole="button"
          accessibilityLabel={`Kelola ${link.label.toLowerCase()}`}
          style={({ pressed }) => [
            styles.linkButton,
            {
              backgroundColor: pressed ? colors.surfaceSubtle : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name={link.icon} size={geometry.iconSmall} color={colors.accent} />
          <Text style={[styles.linkLabel, { color: colors.text.primary }]}>{link.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------------- */
/* Isi saat data tersedia                                                     */
/* ------------------------------------------------------------------------- */

function ReadyContent({ schedules, now }: { schedules: Schedule[]; now: Date }) {
  const { colors } = useTheme();

  // Kelas tersisa = sedang berlangsung + belum mulai (brief 11). Kartu memakai
  // elemen pertama karena daftar sudah urut jam mulai.
  const remaining = getRemainingClasses(schedules, now);
  const nextClass = remaining[0] ?? null;

  // Jam selesai kelas terakhir yang tersisa; null bila tidak ada sisa kelas.
  const lastEndTime = remaining.length > 0 ? remaining[remaining.length - 1].endTime : null;

  return (
    <View>
      <NextClassCard schedule={nextClass} now={now} />

      <RemainingClasses count={remaining.length} lastEndTime={lastEndTime} />

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Tugas</Text>
    </View>
  );
}

/* ------------------------------------------------------------------------- */
/* State memuat, gagal, dan kosong                                            */
/* ------------------------------------------------------------------------- */

function ContentSkeleton() {
  const { colors } = useTheme();

  return (
    <View accessible accessibilityLabel="Memuat jadwal hari ini">
      <View
        style={[
          styles.skeletonCard,
          { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
        ]}
      />
      <View style={styles.skeletonRow}>
        <View style={[styles.skeletonIcon, { backgroundColor: colors.surfaceSubtle }]} />
        <View style={styles.skeletonLinesIndented}>
          <View style={[styles.skeletonLineLong, { backgroundColor: colors.surfaceSubtle }]} />
          <View style={[styles.skeletonLineShort, { backgroundColor: colors.surfaceSubtle }]} />
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.skeletonLines}>
        <View style={[styles.skeletonLineLong, { backgroundColor: colors.surfaceSubtle }]} />
        <View style={[styles.skeletonLineShort, { backgroundColor: colors.surfaceSubtle }]} />
      </View>
    </View>
  );
}

function ReadErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={styles.errorBox}>
      <View style={styles.errorTitleRow}>
        <Ionicons name="alert-circle-outline" size={geometry.icon} color={colors.overdue.text} />
        <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
          Jadwal belum dapat dimuat
        </Text>
      </View>

      <Text style={[styles.errorDetail, { color: colors.text.secondary }]}>{message}</Text>

      {/* Aksi hanya ada karena pembacaan ulang memang didukung lapisan data. */}
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Coba lagi memuat jadwal"
        style={({ pressed }) => [
          styles.retryButton,
          {
            borderColor: colors.border,
            backgroundColor: pressed ? colors.surfaceSubtle : colors.surface,
          },
        ]}
      >
        <Ionicons name="refresh-outline" size={geometry.iconSmall} color={colors.accent} />
        <Text style={[styles.retryText, { color: colors.text.primary }]}>Coba lagi</Text>
      </Pressable>
    </View>
  );
}

function NoTasks() {
  const { colors } = useTheme();

  return (
    <View style={styles.emptyTasks} accessible accessibilityLabel="Semua tugas sudah beres">
      <Text style={[styles.emptyTasksTitle, { color: colors.text.primary }]}>
        Semua tugas sudah beres.
      </Text>
      <Text style={[styles.emptyTasksCaption, { color: colors.text.secondary }]}>
        Belum ada tugas yang perlu diselesaikan.
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------------- */
/* Gaya                                                                       */
/* ------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    ...typography.title,
    fontFamily,
    flexShrink: 1,
  },
  accentDot: {
    width: geometry.statusDot,
    height: geometry.statusDot,
    borderRadius: geometry.statusDot / 2,
    marginTop: spacing.sm,
    marginLeft: spacing.xxs,
  },
  date: {
    ...typography.body,
    fontFamily,
    marginTop: spacing.xxs,
  },
  headerGap: {
    height: spacing.lg,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: geometry.touchTarget,
    paddingHorizontal: spacing.md,
    borderWidth: geometry.borderWidth,
    borderRadius: radius.small,
    gap: spacing.xxs,
  },
  linkLabel: {
    ...typography.body,
    fontFamily,
  },
  divider: {
    height: geometry.dividerWidth,
    width: '100%',
  },
  sectionTitle: {
    ...typography.section,
    fontFamily,
    paddingTop: spacing.lg,
  },
  emptyTasks: {
    paddingVertical: spacing.md,
  },
  emptyTasksTitle: {
    ...typography.bodyStrong,
    fontFamily,
  },
  emptyTasksCaption: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xxs,
  },
  errorBox: {
    paddingVertical: spacing.md,
  },
  errorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorTitle: {
    ...typography.bodyStrong,
    fontFamily,
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  errorDetail: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xs,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    minHeight: geometry.touchTarget,
    minWidth: geometry.touchTarget,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.small,
    borderWidth: geometry.borderWidth,
  },
  retryText: {
    ...typography.body,
    fontFamily,
    marginLeft: spacing.xs,
  },
  skeletonCard: {
    minHeight: geometry.heroMinimumHeight,
    borderRadius: radius.card,
    borderWidth: geometry.borderWidth,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  skeletonIcon: {
    width: geometry.summaryIconContainer,
    height: geometry.summaryIconContainer,
    borderRadius: radius.small,
  },
  skeletonLines: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  skeletonLinesIndented: {
    flex: 1,
    marginLeft: spacing.md,
  },
  skeletonLineLong: {
    height: typography.bodyStrong.lineHeight,
    borderRadius: radius.small,
    width: '70%',
  },
  skeletonLineShort: {
    height: typography.caption.lineHeight,
    borderRadius: radius.small,
    width: '45%',
    marginTop: spacing.xs,
  },
});
