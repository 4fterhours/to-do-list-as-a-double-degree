import { useLocalSearchParams } from 'expo-router';

import { TaskFormScreen } from '../../../components/TaskFormScreen';

/** Ubah tugas yang sudah ada (route /tugas/:id). */
export default function EditTaskRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Number(id);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    return <TaskFormScreen taskId={null} />;
  }

  return <TaskFormScreen taskId={taskId} />;
}
