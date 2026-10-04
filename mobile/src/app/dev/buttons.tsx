import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, IconButton, SmallButton } from '@/components/ui';

export default function ButtonsPreview() {
  const [message, setMessage] = useState('まだ押されていません');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <PageLayout header={<ScreenHeader title="小さいボタン" />} testID="buttons-preview">
      <AppText variant="bodyLgBold">IconButton</AppText>
      <View style={styles.row}>
        <IconButton
          accessibilityLabel="追加"
          icon="plus"
          onPress={() => setMessage('追加を押しました')}
          testID="icon-button-primary"
        />
        <IconButton
          accessibilityLabel="次へ"
          icon="forward"
          onPress={() => setMessage('次へを押しました')}
          testID="icon-button-secondary"
        />
        <IconButton
          accessibilityLabel="押せないボタン"
          icon="minus"
          onPress={() => undefined}
          disabled
          testID="icon-button-disabled"
        />
      </View>

      <AppText variant="bodyLgBold">SmallButton</AppText>
      <View style={styles.row}>
        <SmallButton label="保存" onPress={() => setMessage('保存を押しました')} testID="small-button-primary" />
        <SmallButton label="変更" variant="secondary" onPress={() => setMessage('変更を押しました')} testID="small-button-secondary" />
        <SmallButton label="キャンセル" variant="outline" onPress={() => setMessage('キャンセルを押しました')} testID="small-button-outline" />
        <SmallButton label="押せません" disabled onPress={() => undefined} testID="small-button-disabled" />
      </View>

      <AppText testID="buttons-result">確認結果：{message}</AppText>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
