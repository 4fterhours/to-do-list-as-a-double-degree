import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listCourses } from '../db/courses';
import { createTask, deleteTask, getTaskById, updateTask } from '../db/tasks';
import { useFocusQuery } from '../hooks/useFocusQuery';
import { breakpoint, fontFamily, spacing, typography } from '../lib/tokens';
import {
  hasErrors,
  validateTaskForm,
  type TaskFormErrors,
} from '../lib/validation';
import { useTheme } from '../theme/useTheme';
import { ButtonRow, DangerButton, PrimaryButton } from './Buttons';
import { ChipRow } from './ChipRow';
import { ConfirmDialog } from './ConfirmDialog';
import { DateField, TimeField } from './DateTimeField';
import { FormField } from './FormField';
import { ScreenHeader } from './ScreenHeader';
import { TextField } from './TextField';

/**
 * Form tambah/edit tugas.
 *
 * Relasi mata kuliah bersifat opsional. Daftar pilihannya berasal dari tabel
 * `courses` (identitas mata kuliah), bukan dari satu entri jadwal — sehingga
 * mata kuliah dengan beberapa sesi mingguan tetap satu pilihan.
 */

type CourseOption = { value: string; label: string };

export function TaskFormScreen({ taskId }: { taskId: number | null }) {
  if (taskId === null) {
    return <TaskForm taskId={null} initial={null} courses={null} />;
  }
  return <EditTaskForm taskId={taskId} />;
}

function EditTaskForm({ taskId }: { taskId: number }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { state, reload } = useFocusQuery(async (db) => {
    const [task, courses] = await Promise.all([getTaskById(db, taskId), listCourses(db)]);
    return { task, courses };
  });

  const horizontalPadding = width < breakpoint.compactWidth ? spacing.md : spacing.lg;

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <ScreenHeader title="Ubah tugas" />
          <Text style={[styles.hint, { color: colors.text.secondary }]}>Memuat tugas…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <ScreenHeader title="Ubah tugas" />
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            Tugas belum dapat dimuat
          </Text>
          <Text style={[styles.hint, { color: colors.text.secondary }]}>{state.message}</Text>
          <ButtonRow>
            <PrimaryButton label="Coba lagi" onPress={reload} />
          </ButtonRow>
        </View>
      </SafeAreaView>
    );
  }

  if (!state.data.task) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <ScreenHeader title="Ubah tugas" />
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            Tugas tidak ditemukan.
          </Text>
          <Text style={[styles.hint, { color: colors.text.secondary }]}>
            Mungkin sudah dihapus. Kembali untuk melihat daftar terbaru.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <TaskForm taskId={taskId} initial={state.data.task} courses={state.data.courses} />
  );
}

function TaskForm({
  taskId,
  initial,
  courses,
}: {
  taskId: number | null;
  initial: {
    title: string;
    deadlineAt: number;
    courseId: number | null;
  } | null;
  courses: { id: number; name: string }[] | null;
}) {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Untuk mode tambah, daftar mata kuliah diambil sendiri lewat hook.
  const coursesQuery = useFocusQuery(listCourses);
  const availableCourses =
    courses ??
    (coursesQuery.state.status === 'ready' ? coursesQuery.state.data : []);

  const initialDeadline = initial ? new Date(initial.deadlineAt) : defaultDeadline();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [deadline, setDeadline] = useState<Date>(initialDeadline);
  const [courseId, setCourseId] = useState<number | null>(initial?.courseId ?? null);

  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const horizontalPadding = width < breakpoint.compactWidth ? spacing.md : spacing.lg;

  const courseOptions: CourseOption[] = availableCourses.map((course) => ({
    value: String(course.id),
    label: course.name,
  }));

  const handleSubmit = async () => {
    const nextErrors = validateTaskForm({ title, deadlineAt: deadline.getTime() });
    setErrors(nextErrors);
    setSubmitError(null);

    if (hasErrors(nextErrors)) {
      return;
    }

    setSaving(true);
    try {
      const input = { title: title.trim(), deadlineAt: deadline.getTime(), courseId };

      if (taskId === null) {
        await createTask(db, input);
      } else {
        await updateTask(db, taskId, input);
      }

      router.back();
    } catch (error) {
      console.error('[tugas] Gagal menyimpan tugas:', error);
      setSubmitError(error instanceof Error ? error.message : 'Tugas gagal disimpan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (taskId === null) return;

    setDeleting(true);
    setSubmitError(null);
    try {
      await deleteTask(db, taskId);
      setConfirmVisible(false);
      router.back();
    } catch (error) {
      console.error('[tugas] Gagal menghapus tugas:', error);
      setSubmitError(error instanceof Error ? error.message : 'Tugas gagal dihapus. Coba lagi.');
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
            title={taskId === null ? 'Tambah tugas' : 'Ubah tugas'}
            subtitle="Deadline memakai waktu lokal perangkat"
          />

          <FormField label="Judul tugas" error={errors.title}>
            <TextField
              value={title}
              onChangeText={setTitle}
              placeholder="Misalnya Analisis Putusan Pengadilan"
              invalid={Boolean(errors.title)}
              maxLength={140}
              autoCapitalize="sentences"
              accessibilityLabel="Judul tugas"
            />
          </FormField>

          <FormField label="Tanggal deadline" error={errors.deadlineAt}>
            <DateField
              value={deadline}
              onChange={(next) =>
                setDeadline(
                  new Date(
                    next.getFullYear(),
                    next.getMonth(),
                    next.getDate(),
                    deadline.getHours(),
                    deadline.getMinutes(),
                    0,
                    0
                  )
                )
              }
              invalid={Boolean(errors.deadlineAt)}
              accessibilityLabel="Tanggal deadline"
            />
          </FormField>

          <FormField label="Jam deadline">
            <TimeField
              value={deadline}
              onChange={(next) =>
                setDeadline(
                  new Date(
                    deadline.getFullYear(),
                    deadline.getMonth(),
                    deadline.getDate(),
                    next.getHours(),
                    next.getMinutes(),
                    0,
                    0
                  )
                )
              }
              accessibilityLabel="Jam deadline"
            />
          </FormField>

          <FormField
            label="Mata kuliah"
            hint={
              courseOptions.length === 0
                ? 'Belum ada mata kuliah. Tambahkan lewat menu Jadwal.'
                : 'Opsional — ketuk pilihan aktif untuk mengosongkan'
            }
          >
            {courseOptions.length > 0 ? (
              <ChipRow
                options={courseOptions}
                selected={courseId === null ? null : String(courseId)}
                onSelect={(value) => setCourseId(value === null ? null : Number(value))}
                allowDeselect
                accessibilityLabel="Pilih mata kuliah"
              />
            ) : null}
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
            {taskId === null ? null : (
              <DangerButton
                label="Hapus"
                icon="trash-outline"
                onPress={() => setConfirmVisible(true)}
              />
            )}
          </ButtonRow>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmVisible}
        title="Hapus tugas ini?"
        message={`"${title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus tugas"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmVisible(false)}
      />
    </SafeAreaView>
  );
}

/** Deadline awal untuk tugas baru: hari ini pukul 23.59. */
function defaultDeadline(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0, 0);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  hint: {
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
});
