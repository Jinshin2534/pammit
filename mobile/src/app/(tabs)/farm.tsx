import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { HeaderBackground } from '@/components/background/header-background';
import { MetricTile } from '@/components/dashboard';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Dropdown } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';
import { useAppState } from '@/providers/app-state';
import { useCurrentUser } from '@/providers/auth';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;
const metrics = ['土壌水分', '気温', '湿度', '気圧'] as const;
type Metric = (typeof metrics)[number];
const metricData: Record<Metric, {
  value: string;
  description: string;
  ticks: readonly string[];
  points: readonly number[];
  threshold: number;
  interpretation: string;
  detail: string;
}> = {
  '土壌水分': {
    value: '31%',
    description: '現在の土壌水分\n明日午前 27%予測',
    ticks: ['40%', '36%', '32%', '28%'],
    points: [50, 60, 70, 110, 135, 150],
    threshold: 140,
    interpretation: '明日午前は、確認のタイミング',
    detail: '乾燥が続くと、目安の28%を下回る予測。\n土の状態を見て灌水を検討しましょう。',
  },
  '気温': {
    value: '32℃',
    description: '現在の気温\n明日最高 34℃予測',
    ticks: ['36℃', '32℃', '28℃', '24℃'],
    points: [118, 96, 82, 70, 54, 42],
    threshold: 25,
    interpretation: '日中の高温に注意',
    detail: '明日は気温が上がる予測です。\n涼しい午前中の作業を検討しましょう。',
  },
  '湿度': {
    value: '65%',
    description: '現在の湿度\n明日午前 62%予測',
    ticks: ['80%', '70%', '60%', '50%'],
    points: [64, 72, 60, 86, 78, 70],
    threshold: 100,
    interpretation: '湿度は安定しています',
    detail: '急な変化はない予測です。\n葉の状態を見ながら作業しましょう。',
  },
  '気圧': {
    value: '1008hPa',
    description: '現在の気圧\n明日午前 1005hPa予測',
    ticks: ['1020', '1010', '1000', '990'],
    points: [92, 85, 74, 80, 68, 62],
    threshold: 120,
    interpretation: '気圧はゆるやかに低下',
    detail: '天気の変化に注意してください。\n雨雲と風の状況も確認しましょう。',
  },
};
const xAxisTicks = ['一昨日', '昨日', '今日12:15', '明日9:00'] as const;

export default function FarmScreen() {
  const { farms } = useAppState();
  const role = useCurrentUser()?.role ?? 'worker';
  const [plotIndex, setPlotIndex] = useState(0);
  const [view, setView] = useState<'summary' | 'trend'>('summary');
  const [metric, setMetric] = useState<Metric>('土壌水分');
  const selectedMetric = metricData[metric];
  const farmOptions = farms.map(({ name }) => ({ label: name, value: name }));
  const selectedFarm = farms[plotIndex]?.name;

  return (
    <PageLayout
      background={<HeaderBackground />}
      contentPadding={16}
      header={view === 'trend'
        ? <ScreenHeader title="データ推移" showBack onBack={() => setView('summary')} />
        : <ScreenHeader title="農園" />}
      footer={<BottomNav role={role} activeTab="farm" onTabPress={(tab) => router.navigate(routes[tab])} />}
      scrollable={false}
      testID="farm-screen">
      {view === 'summary' ? <View style={styles.summary}>
        <Dropdown
          options={farmOptions}
          value={selectedFarm ? [selectedFarm] : []}
          placeholder="農園を選んでください"
          onChange={(next) => setPlotIndex(Math.max(0, farms.findIndex((farm) => farm.name === next[0])))}
          testID="farm-selector"
        />

        <View style={[styles.panel, styles.conclusion]}>
          <View style={styles.judgement}>
            <View style={styles.judgementCopy}>
              <AppText variant="captionBold" style={styles.accent}>水管理 • 様子を見ましょう</AppText>
              <AppText variant="bodyLgBold" style={styles.deep}>{'今すぐの灌水は\n必要なさそうです'}</AppText>
            </View>
            <Image source={require('../../../assets/images/pamikun.png')} contentFit="cover" style={styles.farmCharacter} />
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
          <AppText variant="bodyBold" style={styles.deep}>明日午前 • 土の状態を確認</AppText>
          <AppText variant="caption" style={styles.muted}>灌水するかは、畑を見て判断</AppText>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/schedule/new', params: { date: '2026-10-11', source: 'farm' } })} style={styles.addButton}><AppText style={styles.addButtonText}>確認を明日の予定に追加</AppText></Pressable>
        </View>
      </View> : <View style={styles.trend}>
        <View style={styles.metricSwitch}>
          {metrics.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: metric === item }} onPress={() => setMetric(item)} style={[styles.metricChoice, metric === item && styles.metricChoiceActive]}>
            <AppText variant="caption" style={[styles.deep, metric === item && styles.metricChoiceText]}>{item}</AppText>
          </Pressable>)}
        </View>
        <View style={styles.trendCard}>
          <View style={styles.actual}>
            <AppText variant="title" adjustsFontSizeToFit numberOfLines={1} style={styles.actualValue}>{selectedMetric.value}</AppText>
            <AppText variant="caption" style={styles.muted}>{selectedMetric.description}</AppText>
          </View>
          <View style={styles.chartWrap}>
            <TrendChart points={selectedMetric.points} threshold={selectedMetric.threshold} />
            {selectedMetric.ticks.map((label, index) => (
              <AppText
                key={label}
                variant="small"
                style={[styles.yAxisLabel, { top: 15 + index * 40 }]}>
                {label}
              </AppText>
            ))}
          </View>
          <View style={styles.axis}>
            {xAxisTicks.map((label) => (
              <AppText
                key={label}
                variant="small"
                numberOfLines={1}
                style={[styles.axisLabel, styles.muted]}>
                {label}
              </AppText>
            ))}
          </View>
        </View>
        <View style={[styles.panel, styles.interpretation]}>
          <AppText variant="bodyBold" style={styles.deep}>{selectedMetric.interpretation}</AppText>
          <AppText variant="caption" style={styles.muted}>{selectedMetric.detail}</AppText>
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

function TrendChart({ points, threshold }: { points: readonly number[]; threshold: number }) {
  const xs = [28, 72, 119, 170, 230, 286];
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${xs[index]} ${point}`).join(' ');
  const actualPath = points.slice(0, 4).map((point, index) => `${index === 0 ? 'M' : 'L'}${xs[index]} ${point}`).join(' ');
  const forecastPath = points.slice(3).map((point, index) => `${index === 0 ? 'M' : 'L'}${xs[index + 3]} ${point}`).join(' ');
  const area = `${path} L286 165 L28 165 Z`;

  return (
    <Svg height="100%" width="100%" viewBox="0 0 296 170">
      <Rect x={170} y={5} width={120} height={160} rx={8} fill="#FFF7EB" />
      {[20, 60, 100, 140].map((y) => <Line key={y} x1={28} x2={290} y1={y} y2={y} stroke="#E7ECE3" />)}
      <Path d={area} fill="#EFF7E8" />
      <Path d={actualPath} fill="none" stroke={colors.primary} strokeWidth={3} />
      <Path d={forecastPath} fill="none" stroke={colors.accent} strokeDasharray="5 4" strokeWidth={3} />
      <Line x1={28} x2={290} y1={threshold} y2={threshold} stroke={colors.accent} strokeDasharray="3 4" />
      {points.slice(0, 4).map((point, index) => <Circle key={xs[index]} cx={xs[index]} cy={point} r={index === 3 ? 5 : 4} fill={colors.primary} />)}
      <Circle cx={286} cy={points[5]} r={4} fill={colors.accent} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', flex: 1, gap: 16 },
  panel: { backgroundColor: colors.surface, borderColor: '#E7ECE3', borderRadius: radii.md, borderWidth: 1, gap: 6, padding: 14, width: '100%' },
  conclusion: { backgroundColor: colors.surfaceWarm, minHeight: 138 },
  judgement: { flexDirection: 'row', gap: 8 },
  judgementCopy: { gap: 2, width: 224 },
  farmCharacter: { height: 40, width: 60 },
  accent: { color: colors.accent, lineHeight: 25 },
  deep: { color: colors.textDeep },
  muted: { color: colors.textMutedGreen, lineHeight: 13 },
  waterHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  metricRow: { flexDirection: 'row', gap: 8, maxWidth: '100%', overflow: 'hidden' },
  link: { color: colors.link, lineHeight: 25 },
  nextWork: { backgroundColor: '#E0F0D8', borderColor: '#E7ECE3', borderRadius: radii.md, borderWidth: 1, gap: 6, padding: 12, width: '100%' },
  addButton: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: radii.full, height: 48, justifyContent: 'center', paddingHorizontal: 24, width: '100%' },
  addButtonText: { color: colors.textInverse, fontFamily: 'ZenMaruGothic-Medium', fontSize: 15, lineHeight: 15 },
  trend: { flex: 1, gap: 10 },
  metricSwitch: { flexDirection: 'row', gap: 8 },
  metricChoice: { backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 8 },
  metricChoiceActive: { backgroundColor: colors.primary },
  metricChoiceText: { fontFamily: 'ZenMaruGothic-Bold', lineHeight: 25 },
  trendCard: { backgroundColor: colors.surface, borderColor: '#E7ECE3', borderRadius: radii.md, borderWidth: 1, gap: 6, overflow: 'hidden', padding: 14 },
  actual: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  actualValue: { color: colors.textDeep, flexShrink: 1, maxWidth: 150 },
  chartWrap: { aspectRatio: 296 / 170, maxWidth: 296, overflow: 'hidden', position: 'relative', width: '100%' },
  yAxisLabel: { color: colors.textMutedGreen, left: 0, lineHeight: 10, position: 'absolute', textAlign: 'right', width: 24 },
  axis: { alignItems: 'center', flexDirection: 'row', height: 12, justifyContent: 'space-between', paddingLeft: 22, width: '100%' },
  axisLabel: { flex: 1, lineHeight: 10, textAlign: 'center' },
  interpretation: { backgroundColor: colors.surfaceWarm },
});
