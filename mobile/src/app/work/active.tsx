import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActiveWorkHeader, WorkButton, WorkChoice, WorkCounts, WorkPage, workTextStyles } from '@/components/work/figma-work-ui';
import { colors, fonts, radii } from '@/theme/tokens';

export default function ActiveWorkScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string; hat?: string; hatDisconnected?: string; offline?: string }>();
  const withHat = params.hat !== '使用しない';
  const disconnected = withHat && params.hatDisconnected === '1';
  const plot = params.plot ?? '三番ハウス';
  const work = params.work ?? (withHat ? '収穫' : '肥料');

  return (
    <WorkPage
      backgroundPosition="center"
      header={<>{disconnected ? <ConnectionBanner kind="hat" /> : params.offline === '1' ? <ConnectionBanner kind="network" /> : null}<ActiveWorkHeader plot={plot} work={work} compact={disconnected || params.offline === '1'} /></>}
      footer={<View style={styles.footer}><WorkButton label="作業終了" variant="cta" onPress={() => router.push({ pathname: '/work/finish', params })} /><Text maxFontSizeMultiplier={1.2} style={workTextStyles.caption}>長押し</Text></View>}
      contentStyle={styles.content}
      testID="work-active-screen">
      {withHat ? (
        <>
          <Text maxFontSizeMultiplier={1.2} style={workTextStyles.bodyLg}>作業ログ</Text>
          <WorkCounts />
          <Text maxFontSizeMultiplier={1.2} style={workTextStyles.bodyLgBold}>00:12:34</Text>
          <WorkChoice label="AI相談ログ" onPress={() => router.push('/work/log')} />
        </>
      ) : (
        <>
          <Text maxFontSizeMultiplier={1.2} style={workTextStyles.bodyLgBold}>00:12:34</Text>
          <WorkChoice label="AI相談" onPress={() => router.push('/(tabs)/ai')} />
        </>
      )}
    </WorkPage>
  );
}

function ConnectionBanner({ kind }: { kind: 'hat' | 'network' }) {
  const message = kind === 'hat'
    ? '帽子との接続が切れました。帽子の電源と距離を確認してください'
    : '通信が切れています。通信が必要な機能は利用できません';
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <View style={styles.alertIcon}><Text style={styles.alertMark}>!</Text></View>
      <Text maxFontSizeMultiplier={1.2} style={styles.bannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  footer: { alignItems: 'center', gap: 6, paddingBottom: 32, paddingHorizontal: 40, paddingTop: 12 },
  banner: { alignItems: 'center', backgroundColor: colors.cta, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, width: '100%' },
  alertIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.full, height: 24, justifyContent: 'center', width: 24 },
  alertMark: { color: colors.cta, fontFamily: fonts.bold, fontSize: 15, includeFontPadding: false, lineHeight: 25 },
  bannerText: { color: colors.textInverse, flex: 1, fontFamily: fonts.medium, fontSize: 15, includeFontPadding: false, lineHeight: 15 },
});
