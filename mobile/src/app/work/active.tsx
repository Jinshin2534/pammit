import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ConnectionErrorBanners } from '@/components/feedback';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Button, Card, SmallButton } from '@/components/ui';
import { WorkSummary } from '@/components/work';

export default function ActiveWorkScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string; hat?: string; hatDisconnected?: string; offline?: string }>();
  const withHat = params.hat !== '使用しない';
  return <PageLayout header={<View><ConnectionErrorBanners networkDisconnected={params.offline === '1'} hatDisconnected={withHat && params.hatDisconnected === '1'} onRetryNetwork={() => router.setParams({ offline: undefined })} onReconnectHat={() => router.setParams({ hatDisconnected: undefined })} testID="work-connection-errors" /><ScreenHeader title="作業中" topPadding={16} /></View>} testID="work-active-screen"><WorkSummary {...params} /><Card variant="outlined"><View style={styles.timer}><AppText variant="caption">経過時間</AppText><AppText variant="display">00:42:18</AppText></View></Card>{withHat && <View style={styles.metrics}><Card title="切る" body="12件" variant="filled" style={styles.metric} /><Card title="残す" body="35件" variant="filled" style={styles.metric} /><Card title="判断不可" body="2件" variant="muted" style={styles.metric} /></View>}<AppText variant="caption">同期済み49件 / 未送信0件</AppText><SmallButton label="AI相談ログ" variant="outline" onPress={() => router.push('./log')} /><Button label="作業を終了する" size="lg" variant="cta" onPress={() => router.push({ pathname: '/work/finish', params })} /></PageLayout>;
}

const styles = StyleSheet.create({ timer: { alignItems: 'center' }, metrics: { flexDirection: 'row', gap: 8 }, metric: { flex: 1, paddingHorizontal: 10 } });
