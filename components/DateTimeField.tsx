import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { fontFamily, geometry, radius, spacing, typography } from '../lib/tokens';
import { minutesToClock } from '../lib/time';
import { useTheme } from '../theme/useTheme';
import { TextField } from './TextField';

/**
 * Pemilih tanggal & waktu.
 *
 * - Android/iOS: `@react-native-community/datetimepicker` (dialog native).
 * - Web: paket itu tidak mendukung web (merender null), jadi dipakai input teks
 *   berformat tetap. Ini hanya jalur sekunder; target aplikasi adalah Android.
 *
 * Nilai selalu berupa `Date` lokal, sehingga penyimpanan ke SQLite memakai
 * `getTime()` (epoch milidetik) yang konsisten dengan skema.
 */

type BaseProps = {
  value: Date;
  onChange: (next: Date) => void;
  invalid?: boolean;
  accessibilityLabel: string;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateInput(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Mengurai 'DD/MM/YYYY' menjadi Date lokal; null bila tidak sah. */
export function parseDateInput(text: string, base: Date): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const candidate = new Date(year, month - 1, day, base.getHours(), base.getMinutes(), 0, 0);

  // Tolak tanggal yang "meluber" (mis. 31/02 menjadi 3 Maret).
  if (
    candidate.getDate() !== day ||
    candidate.getMonth() !== month - 1 ||
    candidate.getFullYear() !== year
  ) {
    return null;
  }
  return candidate;
}

/** Mengurai 'HH:mm' menjadi Date lokal (tanggal mengikuti `base`). */
export function parseTimeInput(text: string, base: Date): Date | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(text.trim());
  if (!match) return null;

  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    Number(match[1]),
    Number(match[2]),
    0,
    0
  );
}

function WebErrorText({ message }: { message: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.webError, { color: colors.overdue.text }]}>{message}</Text>;
}

function FieldShell({
  children,
  invalid,
  accessibilityLabel,
  valueText,
  onPress,
}: {
  children?: React.ReactNode;
  invalid?: boolean;
  accessibilityLabel: string;
  valueText: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}: ${valueText}`}
      style={[
        styles.shell,
        {
          backgroundColor: colors.surface,
          borderColor: invalid ? colors.overdue.text : colors.border,
        },
      ]}
    >
      {children ?? <Text style={[styles.value, { color: colors.text.primary }]}>{valueText}</Text>}
    </Pressable>
  );
}

export function DateField({ value, onChange, invalid, accessibilityLabel }: BaseProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (Platform.OS === 'web') {
    return (
      <View>
        <TextField
          value={formatDateInput(value)}
          onChangeText={(text) => {
            const parsed = parseDateInput(text, value);
            if (parsed) {
              setError(null);
              onChange(parsed);
            } else {
              setError('Gunakan format DD/MM/YYYY.');
            }
          }}
          placeholder="DD/MM/YYYY"
          invalid={invalid}
          accessibilityLabel={accessibilityLabel}
        />
        {error ? <WebErrorText message={error} /> : null}
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, next?: Date) => {
    setOpen(false);
    if (event.type === 'set' && next) {
      onChange(next);
    }
  };

  return (
    <View>
      <FieldShell
        invalid={invalid}
        accessibilityLabel={accessibilityLabel}
        valueText={formatDateInput(value)}
        onPress={() => setOpen(true)}
      />
      {open ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={handleChange}
          is24Hour
        />
      ) : null}
    </View>
  );
}

export function TimeField({ value, onChange, invalid, accessibilityLabel }: BaseProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (Platform.OS === 'web') {
    return (
      <View>
        <TextField
          value={formatTimeInput(value)}
          onChangeText={(text) => {
            const parsed = parseTimeInput(text, value);
            if (parsed) {
              setError(null);
              onChange(parsed);
            } else {
              setError('Gunakan format HH:mm (24 jam).');
            }
          }}
          placeholder="HH:mm"
          invalid={invalid}
          accessibilityLabel={accessibilityLabel}
        />
        {error ? <WebErrorText message={error} /> : null}
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, next?: Date) => {
    setOpen(false);
    if (event.type === 'set' && next) {
      onChange(next);
    }
  };

  return (
    <View>
      <FieldShell
        invalid={invalid}
        accessibilityLabel={accessibilityLabel}
        valueText={formatTimeInput(value)}
        onPress={() => setOpen(true)}
      />
      {open ? (
        <DateTimePicker
          value={value}
          mode="time"
          display="default"
          onChange={handleChange}
          is24Hour
        />
      ) : null}
    </View>
  );
}

/** Teks jam untuk ringkasan di form, mis. '10:00'. */
export function toClockText(date: Date): string {
  return minutesToClock(date.getHours() * 60 + date.getMinutes()).replace('.', ':');
}

const styles = StyleSheet.create({
  shell: {
    minHeight: geometry.touchTarget,
    justifyContent: 'center',
    borderWidth: geometry.borderWidth,
    borderRadius: radius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  value: {
    ...typography.body,
    fontFamily,
  },
  webError: {
    ...typography.caption,
    fontFamily,
    marginTop: spacing.xxs,
  },
});
