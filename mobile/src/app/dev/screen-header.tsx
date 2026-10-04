import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation/screen-header';
import { colors, fonts } from '@/theme/tokens';

export default function ScreenHeaderPreview() {
  const [backCount, setBackCount] = useState(0);

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <View style={styles.screen} testID="screen-header-preview-ready">
      <ScreenHeader title="画面タイトル" testID="screen-header-default" />
      <ScreenHeader
        title="画面タイトル"
        showBack
        onBack={() => setBackCount((count) => count + 1)}
        testID="screen-header-with-back"
      />
      <ScreenHeader
        title="長い画面タイトルの表示確認"
        showBack
        onBack={() => setBackCount((count) => count + 1)}
        testID="screen-header-long"
      />
      <Text style={styles.note} testID="screen-header-back-count">
        戻る操作：{backCount}回
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  note: { fontFamily: fonts.medium, fontSize: 15, padding: 16 },
});
