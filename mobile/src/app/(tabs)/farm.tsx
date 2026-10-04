import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MetricTile } from '@/components/dashboard';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Card, Dropdown, SmallButton } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;

export default function FarmScreen() {
  const [plot, setPlot] = useState<string[]>(['三番ハウス']);
  const [view, setView] = useState<'summary' | 'trend'>('summary');
  const [metric, setMetric] = useState('土壌水分');
  return <PageLayout contentPadding={16} header={<ScreenHeader title="農園" topPadding={16} />} footer={<BottomNav role="owner" activeTab="farm" onTabPress={(tab) => router.navigate(routes[tab])} />} testID="farm-screen"><Dropdown label="園地の切り替え" options={[{ label: '一番ハウス', value: '一番ハウス' }, { label: '二番ハウス', value: '二番ハウス' }, { label: '三番ハウス', value: '三番ハウス' }]} value={plot} onChange={setPlot} /><View style={styles.switcher}><SmallButton label="現在の状態" variant={view === 'summary' ? 'primary' : 'outline'} onPress={() => setView('summary')} /><SmallButton label="データ推移" variant={view === 'trend' ? 'primary' : 'outline'} onPress={() => setView('trend')} /></View>{view === 'summary' ? <><View style={styles.metrics}><MetricTile label="土壌水分" value="35" unit="%" detail="前日より +2%" /><MetricTile label="明日予測" value="32" unit="%" detail="やや乾燥" /></View><View style={styles.metrics}><MetricTile label="気温" value="26" unit="℃" /><MetricTile label="湿度" value="68" unit="%" /></View><Card title="灌水のアドバイス" body="明日の朝、土の乾き具合を確認してから灌水するのがおすすめです。" variant="filled" /></> : <><View style={styles.switcher}>{['土壌水分', '気温', '湿度', '気圧'].map((name) => <SmallButton key={name} label={name} variant={metric === name ? 'primary' : 'outline'} onPress={() => setMetric(name)} />)}</View><Card title={`${metric}の過去7日`} variant="outlined"><View style={styles.chart}>{[42, 56, 48, 68, 62, 75, 58].map((height, index) => <View key={index} style={styles.bar}><View style={[styles.fill, { height }]} /><AppText variant="small">{index + 1}日</AppText></View>)}</View><AppText variant="caption">点線部分は明日の予測です</AppText></Card></>}</PageLayout>;
}

const styles = StyleSheet.create({ switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metrics: { flexDirection: 'row', gap: 12 }, chart: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, height: 130, justifyContent: 'space-around' }, bar: { alignItems: 'center', flex: 1, gap: 4 }, fill: { backgroundColor: colors.primary, borderRadius: radii.full, width: 18 } });
