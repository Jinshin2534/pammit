import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WorkBackButton, WorkButton, workTextStyles } from '@/components/work/figma-work-ui';
import { colors } from '@/theme/tokens';

export default function InsightScreen() {
  const [recording, setRecording] = useState(false);

  return (
    <View style={styles.page} testID="work-insight-screen">
      <Image source={require('../../../assets/images/work-finish-ellipse.svg')} style={styles.ellipse} contentFit="fill" accessible={false} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text maxFontSizeMultiplier={1.2} style={workTextStyles.title}>作業フィニッシュ！</Text>
          <Text maxFontSizeMultiplier={1.2} style={workTextStyles.body}>切る75 / 残す56 / 判断不可2</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.messageGroup}>
            <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.bodyLg, styles.center]}>{'お疲れ様でした！\n今日の気づきを残しておこう'}</Text>
            <View style={styles.recorder}>
              <Image source={require('../../../assets/images/mic.png')} style={styles.mic} contentFit="cover" accessible={false} />
              <WorkButton label={recording ? 'ストップ' : 'スタート'} onPress={() => setRecording((value) => !value)} />
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          <WorkBackButton onPress={() => router.back()} />
          <WorkButton label="ホームへ戻る" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.accent, flex: 1, overflow: 'hidden' },
  ellipse: { height: 516, left: -84, position: 'absolute', top: 142, width: 530 },
  safeArea: { flex: 1 },
  header: { alignItems: 'center', gap: 19, height: 78, paddingBottom: 8, paddingTop: 40, width: '100%' },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 24, paddingHorizontal: 40, paddingTop: 8 },
  messageGroup: { alignItems: 'center', gap: 44, width: 299 },
  center: { textAlign: 'center' },
  recorder: { alignItems: 'center', gap: 24, width: 152 },
  mic: { height: 110, width: 107 },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 32, paddingHorizontal: 40, paddingTop: 12, width: '100%' },
});
