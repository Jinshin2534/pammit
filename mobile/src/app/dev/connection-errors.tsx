import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ConnectionErrorBanners } from '@/components/feedback';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, SmallButton } from '@/components/ui';

export default function ConnectionErrorsPreview() {
  const [network, setNetwork] = useState(true);
  const [hat, setHat] = useState(true);
  if (!__DEV__) return <Redirect href="/" />;
  return <PageLayout header={<ConnectionErrorBanners networkDisconnected={network} hatDisconnected={hat} onRetryNetwork={() => setNetwork(false)} onReconnectHat={() => setHat(false)} testID="preview-connection-errors" />} testID="connection-errors-preview"><ScreenHeader title="エラーの帯" topPadding={16} /><AppText>上の帯は、帽子と通信の状態に応じて個別または同時に表示されます。</AppText><SmallButton label="両方を再表示" onPress={() => { setNetwork(true); setHat(true); }} /></PageLayout>;
}
