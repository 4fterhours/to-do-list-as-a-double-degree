import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listCourses } from '../db/courses';
import {
  createSchedule,
  deleteSchedule,
  getScheduleById,
  updateSchedule,
} from '../db/schedules';
import type { Course } from '../db/types';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { breakpoint, fontFamily, spacing, typography } from '../lib/tokens';
import { clockToMinutes } from '../lib/time';
import {
  DEFAULT_REMINDER_MINUTES,
  hasErrors,
  normalizeRoom,
  validateScheduleForm,
  type ScheduleFormErrors,
  type ScheduleFormValues,
} from '../lib/validation';
import { useTheme } from '../theme/useTheme';
import { ButtonRow, DangerButton, PrimaryButton } from './Buttons';
import { ChipRow } from './ChipRow';
import { ConfirmDialog } from './ConfirmDialog';
import { FormField } from './FormField';
import { ScreenHeader } from './ScreenHeader';
import { TextField } from './TextField';
import { TimeField, formatTimeInput, parseTimeInput } from './DateTimeField';

/**
 * Form tambah/edit jadwal. Satu komponen dipakai dua mode:
 * - `scheduleId == null` → tambah
 * - `scheduleId != null` → edit (memuat data dari SQLite) + tombol hapus
 *
 * Mata kuliah dipilih dari daftar mata kuliah yang sudah ada (chip), dengan
 * opsi eksplisit "Mata kuliah baru". Ini mencegah identitas mata kuliah
 * terpecah tanpa sengaja: salah ketik tidak diam-diam membuat mata kuliah
 * kedua, dan memilih mata kuliah lain berarti memindahkan SATU sesi jadwal
 * (tugas tetap menempel pada mata kuliah asalnya lewat `tasks.course_id`).
 */

const DAY_OPTIONS = [
  { value: '1', label: 'Senin' },
  { value: '2', label: 'Selasa' },
  { value: '3', label: 'Rabu' },
  { value: '4', label: 'Kamis' },
  { value: '5', label: 'Jumat' },
  { value: '6', label: 'Sabtu' },
  { value: '0', label: 'Minggu' },
] as const;

/** Nilai chip khusus untuk mode "mata kuliah baru"; bukan id mata kuliah. */
const NEW_COURSE_VALUE = 'new';

type Props = {
  scheduleId: number | null;
};

type ScheduleFormInitial = {
  courseName: string;
  courseId: number | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  reminderMinutes: number;
};

function defaultTimes(): { start: Date; end: Date } {
  const base = new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 8, 0, 0, 0);
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 9, 40, 0, 0);
  return { start, end };
}

export function ScheduleFormScreen({ scheduleId }: Props) {
  if (scheduleId !== null) {
    return <EditScheduleForm scheduleId={scheduleId} />;
  }
  return <NewScheduleForm />;
}

/** Memuat daftar mata kuliah lebih dulu, lalu merender form tambah. */
function NewScheduleForm() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { state, reload } = useFocusQuery(listCourses);

  const horizontalPadding = width < breakpoint.compactWidth ? spacing.md : spacing.lg;

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <ScreenHeader title="Tambah jadwal" />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Memuat mata kuliah…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <ScreenHeader title="Tambah jadwal" />
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            Mata kuliah belum dapat dimuat
          </Text>
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            {state.message}
          </Text>
          <ButtonRow>
            <PrimaryButton label="Coba lagi" onPress={reload} />
          </ButtonRow>
        </View>
      </SafeAreaView>
    );
  }

  return <ScheduleForm scheduleId={null} initial={null} courses={state.data} />;
}

/** Memuat jadwal + daftar mata kuliah lebih dulu, lalu merender form edit. */
function EditScheduleForm({ scheduleId }: { scheduleId: number }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { state, reload } = useFocusQuery(async (db) => {
    const [schedule, courses] = await Promise.all([
      getScheduleById(db, scheduleId),
      listCourses(db),
    ]);
    return { schedule, courses };
  });

  const horizontalPadding = width < breakpoint.compactWidth ? spacing.md : spacing.lg;

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <ScreenHeader title="Ubah jadwal" />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Memuat jadwal…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <ScreenHeader title="Ubah jadwal" />
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            Jadwal belum dapat dimuat
          </Text>
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            {state.message}
          </Text>
          <ButtonRow>
            <PrimaryButton label="Coba lagi" onPress={reload} />
          </ButtonRow>
        </View>
      </SafeAreaView>
    );
  }

  if (!state.data.schedule) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <ScreenHeader title="Ubah jadwal" />
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            Jadwal tidak ditemukan.
          </Text>
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Mungkin sudah dihapus. Kembali untuk melihat daftar terbaru.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScheduleForm
      scheduleId={scheduleId}
      initial={state.data.schedule}
      courses={state.data.courses}
    />
  );
}

function ScheduleForm({
  scheduleId,
  initial,
  courses,
}: {
  scheduleId: number | null;
  initial: ScheduleFormInitial | null;
  courses: Course[];
}) {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const fallbackTimes = defaultTimes();

  // Mata kuliah: pilih identitas yang sudah ada, atau secara eksplisit membuat
  // yang baru. `initial.courseId` null hanya mungkin untuk baris lama.
  const [isNewCourse, setIsNewCourse] = useState(
    () => initial === null || initial.courseId === null
  );
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    initial?.courseId ?? null
  );
  const [newCourseName, setNewCourseName] = useState(
    initial !== null && initial.courseId === null ? initial.courseName : ''
  );

  const [dayOfWeek, setDayOfWeek] = useState<number>(initial?.dayOfWeek ?? new Date().getDay());
  const [startDate, setStartDate] = useState<Date>(() =>
    initial ? (parseTimeInput(initial.startTime, new Date()) ?? fallbackTimes.start) : fallbackTimes.start
  );
  const [endDate, setEndDate] = useState<Date>(() =>
    initial ? (parseTimeInput(initial.endTime, new Date()) ?? fallbackTimes.end) : fallbackTimes.end
  );
  const [room, setRoom] = useState(initial?.room ?? '');
  const [reminder, setReminder] = useState(
    String(initial?.reminderMinutes ?? DEFAULT_REMINDER_MINUTES)
  );

  const [errors, setErrors] = useState<ScheduleFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const horizontalPadding = width < breakpoint.compactWidth ? spacing.md : spacing.lg;

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const effectiveIsNewCourse = isNewCourse || courses.length === 0;
  const courseName = effectiveIsNewCourse ? newCourseName : (selectedCourse?.name ?? '');

  const courseOptions = [
    ...courses.map((course) => ({ value: String(course.id), label: course.name })),
    { value: NEW_COURSE_VALUE, label: 'Mata kuliah baru' },
  ];

  const selectedCourseValue = effectiveIsNewCourse
    ? NEW_COURSE_VALUE
    : selectedCourseId === null
      ? null
      : String(selectedCourseId);

  const buildValues = (): ScheduleFormValues => ({
    courseName,
    dayOfWeek,
    startTime: formatTimeInput(startDate),
    endTime: formatTimeInput(endDate),
    room,
    reminderMinutes: reminder,
  });

  const handleSubmit = async () => {
    const values = buildValues();
    const nextErrors = validateScheduleForm(values);
    setErrors(nextErrors);
    setSubmitError(null);

    if (hasErrors(nextErrors)) {
      return;
    }

    setSaving(true);
    try {
      const input = {
        courseName: values.courseName.trim(),
        dayOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
        room: normalizeRoom(values.room),
        reminderMinutes: Number(values.reminderMinutes.trim()),
      };

      if (scheduleId === null) {
        await createSchedule(db, input);
      } else {
        await updateSchedule(db, scheduleId, input);
      }

      router.back();
    } catch (error) {
      console.error('[jadwal] Gagal menyimpan jadwal:', error);
      setSubmitError(
        error instanceof Error ? error.message : 'Jadwal gagal disimpan. Coba lagi.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (scheduleId === null) return;

    setDeleting(true);
    setSubmitError(null);
    try {
      await deleteSchedule(db, scheduleId);
      setConfirmVisible(false);
      router.back();
    } catch (error) {
      console.error('[jadwal] Gagal menghapus jadwal:', error);
      setSubmitError(
        error instanceof Error ? error.message : 'Jadwal gagal dihapus. Coba lagi.'
      );
      setConfirmVisible(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={scheduleId === null ? 'Tambah jadwal' : 'Ubah jadwal'}
            subtitle="Jadwal berlaku setiap minggu"
          />

          <FormField
            label="Mata kuliah"
            hint={
              effectiveIsNewCourse
                ? 'Mata kuliah baru akan dibuat dengan nama ini'
                : 'Mata kuliah yang sudah ada — identitasnya tetap sama'
            }
            error={effectiveIsNewCourse ? errors.courseName : undefined}
          >
            <View>
              {courses.length > 0 ? (
                <ChipRow
                  options={courseOptions}
                  selected={selectedCourseValue}
                  onSelect={(value) => {
                    if (value === NEW_COURSE_VALUE) {
                      setIsNewCourse(true);
                      return;
                    }
                    if (value !== null) {
                      setIsNewCourse(false);
                      setSelectedCourseId(Number(value));
                    }
                  }}
                  accessibilityLabel="Pilih mata kuliah"
                />
              ) : null}

              {effectiveIsNewCourse ? (
                <View style={styles.newCourseField}>
                  <TextField
                    value={newCourseName}
                    onChangeText={setNewCourseName}
                    placeholder="Misalnya Hukum Dagang"
                    invalid={Boolean(errors.courseName)}
                    maxLength={80}
                    autoCapitalize="words"
                    accessibilityLabel="Nama mata kuliah baru"
                  />
                </View>
              ) : null}

              {scheduleId !== null && courses.length > 0 ? (
                <Text style={[styles.hint, { color: colors.text.muted }]}>
                  Memilih mata kuliah lain hanya memindahkan jadwal ini; tugas tetap pada mata
                  kuliah asalnya.
                </Text>
              ) : null}
            </View>
          </FormField>

          <FormField label="Hari" error={errors.dayOfWeek}>
            <ChipRow
              options={DAY_OPTIONS}
              selected={String(dayOfWeek)}
              onSelect={(value) => {
                if (value !== null) setDayOfWeek(Number(value));
              }}
              accessibilityLabel="Pilih hari"
            />
          </FormField>

          <FormField label="Jam mulai" error={errors.startTime}>
            <TimeField
              value={startDate}
              onChange={setStartDate}
              invalid={Boolean(errors.startTime)}
              accessibilityLabel="Jam mulai"
            />
          </FormField>

          <FormField
            label="Jam selesai"
            error={errors.endTime}
            hint={
              clockToMinutes(formatTimeInput(startDate)) ===
              clockToMinutes(formatTimeInput(endDate))
                ? 'Jam selesai harus berbeda dari jam mulai.'
                : undefined
            }
          >
            <TimeField
              value={endDate}
              onChange={setEndDate}
              invalid={Boolean(errors.endTime)}
              accessibilityLabel="Jam selesai"
            />
          </FormField>

          <FormField label="Ruang kelas" hint="Boleh dikosongkan bila belum diketahui" error={errors.room}>
            <TextField
              value={room}
              onChangeText={setRoom}
              placeholder="Misalnya B-204"
              invalid={Boolean(errors.room)}
              maxLength={40}
              autoCapitalize="characters"
              accessibilityLabel="Ruang kelas"
            />
          </FormField>

          <FormField
            label="Menit pengingat"
            hint="Disimpan untuk notifikasi tahap berikutnya"
            error={errors.reminderMinutes}
          >
            <TextField
              value={reminder}
              onChangeText={setReminder}
              placeholder="15"
              keyboardType="number-pad"
              maxLength={4}
              invalid={Boolean(errors.reminderMinutes)}
              accessibilityLabel="Menit pengingat sebelum kelas"
            />
          </FormField>

          {submitError ? (
            <Text style={[styles.submitError, { color: colors.overdue.text }]}>{submitError}</Text>
          ) : null}

          <ButtonRow>
            <PrimaryButton
              label={saving ? 'Menyimpan…' : 'Simpan'}
              icon="checkmark"
              onPress={handleSubmit}
              disabled={saving}
            />
            <DangerButton
              label="Hapus"
              icon="trash-outline"
              onPress={() => setConfirmVisible(true)}
            />
          </ButtonRow>

          {scheduleId === null ? null : (
            <Text style={[styles.hint, { color: colors.text.muted }]}>
              Menghapus jadwal tidak menghapus tugas yang terkait mata kuliah ini.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmVisible}
        title="Hapus jadwal ini?"
        message={`"${courseName}" akan dihapus dari jadwal mingguan. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus jadwal"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  newCourseField: {
    marginTop: spacing.xs,
  },
  loadingText: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.bodyStrong,
    fontFamily,
  },
  submitError: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.md,
  },
  hint: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.sm,
  },
});
