import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { errorMessage, FieldSummary, SensorReadingOut, SuggestedSchedule, useFieldSummaries, useHourlyReadings } from '@/api';
import { HeaderBackground } from '@/components/background/header-background';
import { MetricTile } from '@/components/dashboard';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Button, Dropdown } from '@/components/ui';
import { fromApiTime, jstParts, toJstDate, toJstTime, todayJst } from '@/lib/datetime';
import { fromApiWorkType } from '@/lib/work-types';
import { useCurrentUser } from '@/providers/auth';
import { loadSelectedPlotId, saveSelectedPlotId } from '@/storage';
import { colors, radii } from '@/theme/tokens';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;
const metrics = ['土壌水分', '気温', '湿度', '気圧'] as const;
type Metric = (typeof metrics)[number];
const metricConfig: Record<Metric, { unit: string; tickUnit: string; current: (summary: FieldSummary) => number | null | undefined; reading: (reading: SensorReadingOut) => number | null | undefined }> = {
  '土壌水分': { unit: '%', tickUnit: '%', current: (s) => s.soil_moisture_pct, reading: (r) => r.soil_moisture_pct },
  '気温': { unit: '℃', tickUnit: '℃', current: (s) => s.temperature, reading: (r) => r.temperature },
  '湿度': { unit: '%', tickUnit: '%', current: (s) => s.humidity, reading: (r) => r.humidity },
  '気圧': { unit: 'hPa', tickUnit: '', current: (s) => s.pressure, reading: (r) => r.pressure },
};
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** 値がないときは0にせず `--` */
function formatValue(value: number | null | undefined, unit: string) {
  return value == null ? '--' : `${Math.round(value)}${unit}`;
}

/** 前日との差（ポイント）。マイナスは Figma と同じ「−」 */
function formatChange(change: number | null | undefined) {
  if (change == null) return '--';
  const rounded = Math.round(change);
  if (rounded === 0) return '±0pt';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}pt`;
}

/** 今日なら時刻だけ、それ以外は日付も（日本時間） */
function formatMeasuredAt(value: string) {
  if (toJstDate(value) === todayJst()) return toJstTime(value);
  const { month, day } = jstParts(value);
  return `${month}/${day} ${toJstTime(value)}`;
}

/** 測定の状態。has_sensor が false か一度も測っていなければ none、30時間以上届いていなければ stopped */
function sensorNotice(summary: FieldSummary): string | null {
  if (!summary.has_sensor || !summary.last_measured_at) return '測定データがありません';
  if (!summary.measured_at) return `センサーが止まっています（最後の測定 ${formatMeasuredAt(summary.last_measured_at)}）`;
  if (!summary.calibrated || summary.advice.rule === 'not_calibrated') return '土壌水分が校正されていません';
  return null;
}

function openSuggestedSchedule(suggestion: SuggestedSchedule) {
  // 予定入力画面の初期値。担当は空にする（パラメータ名は予定の入力画面とあわせる）
  router.push({
    pathname: '/schedule/new',
    params: {
      date: suggestion.date,
      start: fromApiTime(suggestion.start_time),
      end: fromApiTime(suggestion.end_time),
      plotId: String(suggestion.plot_id),
      workTypes: suggestion.work_types.map(fromApiWorkType).join(','),
      note: suggestion.note,
      source: 'farm',
    },
  });
}

export default function FarmScreen() {
  const role = useCurrentUser()?.role ?? 'worker';
  const summaries = useFieldSummaries();
  // undefined は端末から読み込み中
  const [storedPlotId, setStoredPlotId] = useState<number | null | undefined>(undefined);
  const [view, setView] = useState<'summary' | 'trend'>('summary');
  const [metric, setMetric] = useState<Metric>('土壌水分');

  useEffect(() => {
    let cancelled = false;
    loadSelectedPlotId().then((id) => !cancelled && setStoredPlotId(id));
    return () => { cancelled = true; };
  }, []);

  const { refetch } = summaries;
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));

  const plots = useMemo(() => summaries.data ?? [], [summaries.data]);
  // 覚えていた農地がなくなっていたら（404 plot_not_found と同じ扱い）一覧の先頭にする
  const selected = storedPlotId === undefined ? undefined : plots.find((plot) => plot.plot_id === storedPlotId) ?? plots[0];

  useEffect(() => {
    if (storedPlotId !== undefined && selected && selected.plot_id !== storedPlotId) {
      void saveSelectedPlotId(selected.plot_id);
    }
  }, [selected, storedPlotId]);

  const selectPlot = (id: number) => {
    setStoredPlotId(id);
    void saveSelectedPlotId(id);
  };

  const plotOptions = plots.map((plot) => ({ label: plot.plot_name, value: String(plot.plot_id) }));
  const refreshFailed = summaries.isError && summaries.data !== undefined;

  return (
    <PageLayout
      background={<HeaderBackground />}
      contentPadding={16}
      header={view === 'trend' && selected
        ? <ScreenHeader title="データ推移" showBack onBack={() => setView('summary')} />
        : <ScreenHeader title="農園" />}
      footer={<BottomNav role={role} activeTab="farm" onTabPress={(tab) => router.navigate(routes[tab])} />}
      scrollable={false}
      testID="farm-screen">
      {!summaries.data || storedPlotId === undefined ? <View style={styles.summary}>
        {summaries.isError
          ? <View style={[styles.panel, styles.stateCard]}>
            <AppText variant="body" style={styles.deep}>{errorMessage(summaries.error)}</AppText>
            <Button label="もう一度読み込む" variant="secondary" size="md" onPress={() => void refetch()} />
          </View>
          : <AppText variant="body" style={styles.muted}>読み込んでいます</AppText>}
      </View> : !selected ? <View style={styles.summary}>
        <View style={[styles.panel, styles.stateCard]} testID="farm-empty">
          <AppText variant="bodyBold" style={styles.deep}>農園がまだ登録されていません</AppText>
          {role === 'owner'
            ? <Button label="農園を登録する" variant="secondary" size="md" onPress={() => router.push('/admin/plots')} />
            : <AppText variant="caption" style={styles.muted}>管理者に農園の登録を頼んでください</AppText>}
        </View>
      </View> : view === 'summary' ? <View style={styles.summary}>
        <Dropdown
          options={plotOptions}
          value={[String(selected.plot_id)]}
          placeholder="農園を選んでください"
          onChange={(next) => next[0] && selectPlot(Number(next[0]))}
          testID="farm-selector"
        />
        {refreshFailed && <AppText variant="caption" style={styles.error} testID="farm-refresh-failed">更新できませんでした</AppText>}

        <View style={[styles.panel, styles.conclusion]}>
          <View style={styles.judgement}>
            <View style={styles.judgementCopy}>
              <AppText variant="captionBold" style={styles.accent}>{selected.advice.category}</AppText>
              <AppText variant="bodyLgBold" style={styles.deep}>{selected.advice.headline}</AppText>
            </View>
            <Image source={require('../../../assets/images/pamikun.png')} contentFit="cover" style={styles.farmCharacter} />
          </View>
          <AppText variant="caption" style={styles.muted}>{selected.advice.detail}</AppText>
        </View>

        <SoilPanel summary={selected} onMore={() => setView('trend')} />

        {selected.suggested_schedule && <SuggestionCard suggestion={selected.suggested_schedule} />}
      </View> : <TrendView summary={selected} summaryUpdatedAt={summaries.dataUpdatedAt} metric={metric} onMetricChange={setMetric} summaryRefreshFailed={refreshFailed} />}
    </PageLayout>
  );
}

function SoilPanel({ summary, onMore }: { summary: FieldSummary; onMore: () => void }) {
  const notice = sensorNotice(summary);
  const current = summary.soil_moisture_pct;
  const change = summary.soil_change_24h;
  const previous = current != null && change != null ? current - change : null;

  return (
    <View style={styles.panel}>
      <View style={styles.waterHeader}>
        <AppText variant="bodyLg" style={styles.deep}>土壌水分</AppText>
        {summary.soil_drying && <AppText variant="captionBold" style={styles.accent}>乾燥傾向</AppText>}
      </View>
      {notice && <AppText variant="caption" style={styles.notice} testID="farm-sensor-notice">{notice}</AppText>}
      <View style={styles.metricRow}>
        <MetricTile label="現在" value={formatValue(current, '%')} detail={summary.measured_at ? formatMeasuredAt(summary.measured_at) : undefined} />
        <MetricTile label="昨日との差" value={formatChange(change)} detail={previous != null ? `${formatValue(previous, '%')} → ${formatValue(current, '%')}` : undefined} />
        <MetricTile label="明日予測" value={formatValue(summary.soil_forecast_tomorrow, '%')} detail="午前9時" />
      </View>
      <Pressable onPress={onMore}><AppText variant="captionBold" style={styles.link}>詳しく見る</AppText></Pressable>
    </View>
  );
}

function SuggestionCard({ suggestion }: { suggestion: SuggestedSchedule }) {
  const morning = Number(suggestion.start_time.slice(0, 2)) < 12;
  return (
    <View style={styles.nextWork}>
      <AppText variant="bodyBold" style={styles.deep}>{`明日${morning ? '午前' : '午後'} • 土の状態を確認`}</AppText>
      <AppText variant="caption" style={styles.muted}>灌水するかは、畑を見て判断</AppText>
      <Pressable accessibilityRole="button" onPress={() => openSuggestedSchedule(suggestion)} style={styles.addButton} testID="farm-add-check">
        <AppText style={styles.addButtonText}>確認を明日の予定に追加</AppText>
      </Pressable>
    </View>
  );
}

type ChartPoint = { t: number; v: number };

/** 隣り合う点が1時間より空いていたら線を切る */
function toSegments(points: ChartPoint[]): ChartPoint[][] {
  const segments: ChartPoint[][] = [];
  for (const point of points) {
    const last = segments[segments.length - 1];
    if (last && point.t - last[last.length - 1].t <= HOUR_MS) last.push(point);
    else segments.push([point]);
  }
  return segments;
}

/** 4本の目盛り（上から）。値が全部入るように、きりのよい幅を選ぶ */
function yTicks(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  for (const step of [0.5, 1, 2, 4, 5, 10, 20, 25, 50, 100, 200, 500]) {
    const low = Math.floor(min / step) * step;
    if (low + step * 3 >= max) return [low + step * 3, low + step * 2, low + step, low];
  }
  const step = Math.ceil((max - min) / 3) || 1;
  const low = Math.floor(min);
  return [low + step * 3, low + step * 2, low + step, low];
}

/** 横軸の4つのラベル。4等分した区間の真ん中の日付 */
function xLabels(start: number, end: number, now: number) {
  const today = todayJst(new Date(now));
  const tomorrow = toJstDate(new Date(now + DAY_MS));
  return [0, 1, 2, 3].map((index) => {
    const date = toJstDate(new Date(start + ((index + 0.5) * (end - start)) / 4));
    if (date === today) return '今日';
    if (date === tomorrow) return '明日';
    const [, month, day] = date.split('-');
    return `${Number(month)}/${Number(day)}`;
  });
}

function TrendView({ summary, summaryUpdatedAt, metric, onMetricChange, summaryRefreshFailed }: { summary: FieldSummary; summaryUpdatedAt: number; metric: Metric; onMetricChange: (metric: Metric) => void; summaryRefreshFailed: boolean }) {
  const readings = useHourlyReadings(summary.plot_id);
  const config = metricConfig[metric];
  const soil = metric === '土壌水分';
  const current = config.current(summary);

  const chart = useMemo(() => {
    // 「今」は最後に取得した時刻（描画のたびに変わらないように）
    const now = Math.max(readings.dataUpdatedAt, summaryUpdatedAt);
    // from を省くと今日を含む過去7日
    const start = new Date(`${todayJst(new Date(now))}T00:00:00+09:00`).getTime() - 6 * DAY_MS;
    const forecastAt = new Date(`${summary.tomorrow.date}T09:00:00+09:00`).getTime();
    const forecast = soil && summary.soil_forecast_tomorrow != null ? { t: forecastAt, v: summary.soil_forecast_tomorrow } : null;
    const end = soil ? forecastAt : now;
    const points = (readings.data ?? [])
      .map((reading) => ({ t: new Date(reading.measured_at).getTime(), v: config.reading(reading) }))
      .filter((point): point is ChartPoint => point.v != null && point.t >= start && point.t <= end)
      .sort((a, b) => a.t - b.t);
    return { start, end, now, points, forecast };
  }, [readings.data, readings.dataUpdatedAt, summaryUpdatedAt, config, soil, summary]);

  const notice = !readings.data
    ? readings.isError ? errorMessage(readings.error) : '読み込んでいます'
    : chart.points.length
      ? null
      : soil && !summary.calibrated ? '土壌水分が校正されていません' : '測定データがありません';
  const refreshFailed = summaryRefreshFailed || (readings.isError && readings.data !== undefined);

  return (
    <View style={styles.trend}>
      <View style={styles.metricSwitch}>
        {metrics.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: metric === item }} onPress={() => onMetricChange(item)} style={[styles.metricChoice, metric === item && styles.metricChoiceActive]}>
          <AppText variant="caption" style={[styles.deep, metric === item && styles.metricChoiceText]}>{item}</AppText>
        </Pressable>)}
      </View>
      {refreshFailed && <AppText variant="caption" style={styles.error}>更新できませんでした</AppText>}
      <View style={styles.trendCard}>
        <View style={styles.actual}>
          <AppText variant="title" adjustsFontSizeToFit numberOfLines={1} style={styles.actualValue}>{formatValue(current, config.unit)}</AppText>
          <AppText variant="caption" style={styles.muted}>
            {soil ? `現在の土壌水分\n明日午前 ${formatValue(summary.soil_forecast_tomorrow, '%')}予測` : `現在の${metric}`}
          </AppText>
        </View>
        {notice
          ? <View style={[styles.chartWrap, styles.chartEmpty]}><AppText variant="caption" style={styles.muted}>{notice}</AppText></View>
          : <TrendChart
            points={chart.points}
            start={chart.start}
            end={chart.end}
            now={chart.now}
            forecast={chart.forecast}
            threshold={soil ? summary.soil_check_pct : null}
            tickUnit={config.tickUnit}
          />}
        <View style={styles.axis}>
          {xLabels(chart.start, chart.end, chart.now).map((label, index) => (
            <AppText key={index} variant="small" numberOfLines={1} style={[styles.axisLabel, styles.muted]}>{label}</AppText>
          ))}
        </View>
      </View>
      {soil && summary.soil_note && <View style={[styles.panel, styles.interpretation]}>
        <AppText variant="bodyBold" style={styles.deep}>{summary.soil_note.headline}</AppText>
        <AppText variant="caption" style={styles.muted}>{summary.soil_note.body}</AppText>
      </View>}
      {soil && <View style={styles.metricRow}>
        <MetricTile label="明日の気温" value={formatValue(summary.tomorrow.temp_max, '℃')} detail="最高気温" />
        <MetricTile label="明日の雨" value={formatValue(summary.tomorrow.precip_mm, 'mm')} detail="降水予報" />
        <MetricTile label="確認目安" value={formatValue(summary.soil_check_pct, '%')} detail="農園別設定" />
      </View>}
    </View>
  );
}

const CHART = { left: 28, right: 286, top: 20, bottom: 140, base: 165 } as const;

function TrendChart({ points, start, end, now, forecast, threshold, tickUnit }: {
  points: ChartPoint[];
  start: number;
  end: number;
  now: number;
  forecast: ChartPoint | null;
  threshold: number | null;
  tickUnit: string;
}) {
  const ticks = yTicks([...points.map((point) => point.v), ...(forecast ? [forecast.v] : []), ...(threshold != null ? [threshold] : [])]);
  const [high, , , low] = ticks;
  const x = (t: number) => CHART.left + ((t - start) / Math.max(1, end - start)) * (CHART.right - CHART.left);
  const y = (v: number) => CHART.bottom - ((v - low) / Math.max(0.001, high - low)) * (CHART.bottom - CHART.top);
  const segments = toSegments(points);
  const last = points[points.length - 1];
  const futureX = Math.min(x(now), CHART.right);

  return (
    <View style={styles.chartWrap}>
      <Svg height="100%" width="100%" viewBox="0 0 296 170">
        {end > now && <Rect x={futureX} y={5} width={290 - futureX} height={160} rx={8} fill="#FFF7EB" />}
        {[20, 60, 100, 140].map((lineY) => <Line key={lineY} x1={28} x2={290} y1={lineY} y2={lineY} stroke="#E7ECE3" />)}
        {segments.map((segment) => {
          const line = segment.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.t).toFixed(1)} ${y(point.v).toFixed(1)}`).join(' ');
          const first = segment[0];
          const tail = segment[segment.length - 1];
          return segment.length > 1
            ? [
              <Path key={`area-${first.t}`} d={`${line} L${x(tail.t).toFixed(1)} ${CHART.base} L${x(first.t).toFixed(1)} ${CHART.base} Z`} fill="#EFF7E8" />,
              <Path key={`line-${first.t}`} d={line} fill="none" stroke={colors.primary} strokeWidth={3} />,
            ]
            : <Circle key={`dot-${first.t}`} cx={x(first.t)} cy={y(first.v)} r={2.5} fill={colors.primary} />;
        })}
        {last && forecast && <Path d={`M${x(last.t)} ${y(last.v)} L${x(forecast.t)} ${y(forecast.v)}`} fill="none" stroke={colors.accent} strokeDasharray="5 4" strokeWidth={3} />}
        {threshold != null && <Line x1={28} x2={290} y1={y(threshold)} y2={y(threshold)} stroke={colors.accent} strokeDasharray="3 4" />}
        {last && <Circle cx={x(last.t)} cy={y(last.v)} r={5} fill={colors.primary} />}
        {forecast && <Circle cx={x(forecast.t)} cy={y(forecast.v)} r={4} fill={colors.accent} />}
      </Svg>
      {ticks.map((value, index) => (
        <AppText key={index} variant="small" style={[styles.yAxisLabel, { top: `${((15 + index * 40) / 170) * 100}%` }]}>
          {`${Number.isInteger(value) ? value : value.toFixed(1)}${tickUnit}`}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', flex: 1, gap: 16 },
  panel: { backgroundColor: colors.surface, borderColor: '#E7ECE3', borderRadius: radii.md, borderWidth: 1, gap: 6, padding: 14, width: '100%' },
  stateCard: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  conclusion: { backgroundColor: colors.surfaceWarm, minHeight: 138 },
  judgement: { flexDirection: 'row', gap: 8 },
  judgementCopy: { flexShrink: 1, gap: 2, width: 224 },
  farmCharacter: { height: 40, width: 60 },
  accent: { color: colors.accent, lineHeight: 25 },
  deep: { color: colors.textDeep },
  muted: { color: colors.textMutedGreen, lineHeight: 13 },
  notice: { color: colors.textMutedGreen, lineHeight: 16 },
  error: { alignSelf: 'stretch', color: colors.cta, lineHeight: 16 },
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
  chartEmpty: { alignItems: 'center', justifyContent: 'center' },
  yAxisLabel: { color: colors.textMutedGreen, left: 0, lineHeight: 10, position: 'absolute', textAlign: 'right', width: 24 },
  axis: { alignItems: 'center', flexDirection: 'row', height: 12, justifyContent: 'space-between', paddingLeft: 22, width: '100%' },
  axisLabel: { flex: 1, lineHeight: 10, textAlign: 'center' },
  interpretation: { backgroundColor: colors.surfaceWarm },
});
