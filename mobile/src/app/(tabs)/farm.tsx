import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { MetricTile } from '@/components/dashboard';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;
const plots = ['すだち農園', '一番ハウス', '三番ハウス'];
const metrics = ['土壌水分', '気温', '湿度', '気圧'];

export default function FarmScreen() {
  const [plotIndex, setPlotIndex] = useState(0);
  const [view, setView] = useState<'summary' | 'trend'>('summary');
  const [metric, setMetric] = useState('土壌水分');

  return (
    <PageLayout
      background={<HeaderBackground />}
      contentPadding={16}
      header={view === 'trend'
        ? <ScreenHeader title="データ推移" showBack onBack={() => setView('summary')} />
        : <ScreenHeader title="農園" />}
      footer={<BottomNav role="worker" activeTab="farm" onTabPress={(tab) => router.navigate(routes[tab])} />}
      scrollable={false}
      testID="farm-screen">
      {view === 'summary' ? <View style={styles.summary}>
        <Pressable accessibilityRole="button" onPress={() => setPlotIndex((plotIndex + 1) % plots.length)} style={styles.dropdown}>
          <AppText variant="bodyLg">{plots[plotIndex]}</AppText>
          <AppText variant="bodyLg" style={styles.chevron}>▾</AppText>
        </Pressable>

        <View style={[styles.panel, styles.conclusion]}>
          <View style={styles.judgement}>
            <View style={styles.judgementCopy}>
              <AppText variant="captionBold" style={styles.accent}>水管理・様子を見ましょう</AppText>
              <AppText variant="bodyLgBold" style={styles.deep}>{'今すぐの灌水は\n必要なさそうです'}</AppText>
            </View>
            <Image source={require('../../../assets/images/pamikun-2.png')} contentFit="cover" style={styles.farmCharacter} />
          </View>
          <AppText variant="caption" style={styles.muted}>{'乾燥が進んでいます。\n明日午前に土の状態を確認しましょう。'}</AppText>
        </View>

        <View style={styles.panel}>
          <View style={styles.waterHeader}>
            <AppText variant="bodyLg" style={styles.deep}>土壌水分</AppText>
            <AppText variant="captionBold" style={styles.accent}>乾燥傾向</AppText>
          </View>
          <View style={styles.metricRow}>
            <MetricTile label="現在" value="31%" detail="12:40" />
            <MetricTile label="昨日との差" value="−4%" detail="35% → 31%" />
            <MetricTile label="明日予測" value="27%" detail="午前9時" />
          </View>
          <Pressable onPress={() => setView('trend')}><AppText variant="captionBold" style={styles.link}>詳しく見る</AppText></Pressable>
        </View>

        <View style={styles.nextWork}>
          <AppText variant="bodyBold" style={styles.deep}>明日午前・土の状態を確認</AppText>
          <AppText variant="caption" style={styles.muted}>灌水するかは、畑を見て判断</AppText>
          <Pressable accessibilityRole="button" onPress={() => router.push('/schedule/new')} style={styles.addButton}><AppText style={styles.addButtonText}>確認を明日の予定に追加</AppText></Pressable>
        </View>
      </View> : <View style={styles.trend}>
        <View style={styles.metricSwitch}>
          {metrics.map((item) => <Pressable key={item} onPress={() => setMetric(item)} style={[styles.metricChoice, metric === item && styles.metricChoiceActive]}>
            <AppText variant="caption" style={[styles.deep, metric === item && styles.metricChoiceText]}>{item}</AppText>
          </Pressable>)}
        </View>
        <View style={styles.trendCard}>
          <View style={styles.actual}>
            <AppText variant="title" style={styles.deep}>31%</AppText>
            <AppText variant="caption" style={styles.muted}>{'現在の土壌水分\n明日午前 27%予測'}</AppText>
          </View>
          <Image source={require('../../../assets/icons/soil-moisture-chart.svg')} contentFit="fill" style={styles.chart} />
          <View style={styles.axis}>
            <AppText variant="small" style={styles.muted}>9/30</AppText>
            <AppText variant="small" style={styles.muted}>昨日</AppText>
            <AppText variant="small" style={styles.muted}>今日12:15</AppText>
            <AppText variant="small" style={styles.muted}>明日9:00</AppText>
          </View>
        </View>
        <View style={[styles.panel, styles.interpretation]}>
          <AppText variant="bodyBold" style={styles.deep}>明日午前は、確認のタイミング</AppText>
          <AppText variant="caption" style={styles.muted}>{'乾燥が続くと、目安の28%を下回る予測。\n土の状態を見て灌水を検討しましょう。'}</AppText>
        </View>
        <View style={styles.metricRow}>
          <MetricTile label="明日の気温" value="32℃" detail="最高気温" />
          <MetricTile label="明日の雨" value="0mm" detail="降水予報" />
          <MetricTile label="確認目安" value="28%" detail="農園別設定" />
        </View>
      </View>}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', flex: 1, gap: 16 },
  dropdown: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: 4, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 20, width: '100%' },
  chevron: { color: colors.primary },
  panel: { backgroundColor: colors.surface, borderColor: '#E7ECE3', borderRadius: radii.md, borderWidth: 1, gap: 6, padding: 14, width: '100%' },
  conclusion: { backgroundColor: colors.surfaceWarm, minHeight: 138 },
  judgement: { flexDirection: 'row', gap: 8 },
  judgementCopy: { gap: 2, width: 224 },
  farmCharacter: { height: 40, width: 60 },
  accent: { color: colors.accent, lineHeight: 25 },
  deep: { color: colors.textDeep },
  muted: { color: colors.textMutedGreen, lineHeight: 13 },
  waterHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  metricRow: { flexDirection: 'row', gap: 10 },
  link: { color: colors.link, lineHeight: 25 },
  nextWork: { backgroundColor: '#E0F0D8', borderColor: '#E7ECE3', borderRadius: radii.md, borderWidth: 1, gap: 6, padding: 12, width: '100%' },
  addButton: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: radii.full, height: 48, justifyContent: 'center', paddingHorizontal: 24, width: '100%' },
  addButtonText: { color: colors.textInverse, fontFamily: 'ZenMaruGothic-Medium', fontSize: 15, lineHeight: 15 },
  trend: { flex: 1, gap: 10 },
  metricSwitch: { flexDirection: 'row', gap: 8 },
  metricChoice: { backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 8 },
  metricChoiceActive: { backgroundColor: colors.primary },
  metricChoiceText: { fontFamily: 'ZenMaruGothic-Bold', lineHeight: 25 },
  trendCard: { backgroundColor: colors.surface, borderColor: '#E7ECE3', borderRadius: radii.md, borderWidth: 1, gap: 6, padding: 14 },
  actual: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  chart: { height: 170, width: 296 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', width: 296 },
  interpretation: { backgroundColor: colors.surfaceWarm },
});
