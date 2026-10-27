import { TodayScreen } from '../../components/TodayScreen';

/**
 * Route utama Expo Router. Sesuai brief 13, route ini hanya merender
 * TodayScreen; tidak ada tab navigator atau route tambahan.
 */
export default function IndexRoute() {
  return <TodayScreen />;
}
