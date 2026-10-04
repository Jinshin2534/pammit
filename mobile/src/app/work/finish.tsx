import { router, useLocalSearchParams } from 'expo-router';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Button, Card, SmallButton } from '@/components/ui';
import { WorkSummary } from '@/components/work';

export default function WorkFinishScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string; hat?: string }>();
  return <PageLayout variant="centered" header={<ScreenHeader title="終了確認" showBack onBack={() => router.back()} topPadding={16} />} testID="work-finish-screen"><WorkSummary {...params} /><Card title="作業を終了しますか？" body="終了すると作業時間と判定結果が保存されます。" variant="outlined"><Button label="終了する" size="lg" variant="cta" onPress={() => router.replace('/work/insight')} /><SmallButton label="作業を続ける" variant="outline" onPress={() => router.back()} /></Card><AppText variant="caption">通信が切れている場合は端末へ保存し、復旧後に自動送信します。</AppText></PageLayout>;
}
