import { TodayScreen } from '../../components/TodayScreen';

/**
 * Route utama Expo Router: layar Hari Ini.
 *
 * Tanpa tab navigator (brief 12). Sejak tahap CRUD ada route bertumpuk
 * `/jadwal*` dan `/tugas*` yang dibuka dari layar ini dan ditutup dengan
 * tombol kembali; Hari Ini tetap satu-satunya layar pembuka aplikasi.
 */
export default function IndexRoute() {
  return <TodayScreen />;
}
