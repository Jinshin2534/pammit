import { router, useLocalSearchParams } from 'expo-router';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Button, Card } from '@/components/ui';

export default function WorkerCompleteScreen() {
  const { name = '新しい作業者' } = useLocalSearchParams<{ name?: string }>();
  return <PageLayout variant="centered" header={<ScreenHeader title="作業者登録" topPadding={16} />} testID="worker-complete-screen"><Card title="登録が完了しました" body={`${name}さんへ、下のPINを伝えてください。`} variant="filled"><AppText variant="display" style={{ textAlign: 'center' }}>4827</AppText><AppText variant="caption">PINは本人以外に見せないでください。</AppText></Card><Button label="管理者画面へ戻る" size="lg" onPress={() => router.replace('/admin')} /></PageLayout>;
}
