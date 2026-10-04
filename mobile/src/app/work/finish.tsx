import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { WorkBackButton, WorkButton, WorkPage, workTextStyles } from '@/components/work/figma-work-ui';

export default function WorkFinishScreen() {
  return (
    <WorkPage
      backgroundPosition="center"
      footer={<View style={styles.footer}><WorkBackButton onPress={() => router.back()} /></View>}
      contentStyle={styles.content}
      testID="work-finish-screen">
      <Text maxFontSizeMultiplier={1.2} style={workTextStyles.title}>終了確認</Text>
      <View style={styles.confirmation}>
        <View style={styles.copy}>
          <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.bodyLg, styles.center]}>{'本当に作業を\n終わりますか？'}</Text>
          <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center]}>切る75 / 残す56 / 判断不可2</Text>
        </View>
        <WorkButton label="作業終了" variant="cta" onPress={() => router.replace('/work/insight')} />
      </View>
    </WorkPage>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  confirmation: { alignItems: 'center', alignSelf: 'stretch', gap: 37 },
  copy: { alignSelf: 'stretch', gap: 8 },
  center: { textAlign: 'center' },
  footer: { paddingBottom: 32, paddingHorizontal: 40, paddingTop: 12 },
});
