import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { MenuTile } from '@/components/dashboard';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText } from '@/components/ui';

export default function AdminScreen() {
  return <PageLayout header={<ScreenHeader title="管理者画面" showBack onBack={() => router.back()} topPadding={16} />} testID="admin-screen"><AppText>農園と作業者の管理、農園日誌の確認ができます。</AppText><View style={styles.grid}><MenuTile title="作業者登録" description="作業する人を追加" icon={<AppText variant="title">人</AppText>} onPress={() => router.push('/admin/workers')} /><MenuTile title="農園登録" description="作業場所を追加" icon={<AppText variant="title">畑</AppText>} onPress={() => router.push('/admin/plots')} /><MenuTile title="農園日誌" description="日ごとの記録を確認" icon={<AppText variant="title">本</AppText>} onPress={() => router.push('/admin/journals')} /><MenuTile title="設定" description="アプリの設定" icon={<AppText variant="title">歯</AppText>} onPress={() => router.push('/(tabs)/settings')} /></View></PageLayout>;
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } });
