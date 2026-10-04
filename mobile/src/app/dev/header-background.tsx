import { Redirect } from 'expo-router';

import { HeaderBackground } from '@/components/background/header-background';
import { PageLayout } from '@/components/layout/page-layout';
import { AppText } from '@/components/ui';

export default function HeaderBackgroundPreview() {
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <PageLayout background={<HeaderBackground position="center" />} variant="centered" testID="header-background-preview">
      <AppText variant="title">背景の確認</AppText>
      <AppText>黄色いぼかしが中央に表示されます。</AppText>
    </PageLayout>
  );
}
