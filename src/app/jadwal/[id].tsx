import { useLocalSearchParams } from 'expo-router';

import { ScheduleFormScreen } from '../../../components/ScheduleFormScreen';

/** Ubah jadwal yang sudah ada (route /jadwal/:id). */
export default function EditScheduleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheduleId = Number(id);

  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    return <ScheduleFormScreen scheduleId={null} />;
  }

  return <ScheduleFormScreen scheduleId={scheduleId} />;
}
