import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScheduleCarousel, WorkTypeLegend } from '@/components/schedule';
import { AppText, Button } from '@/components/ui';
import { colors, fonts, radii, workTypeColors } from '@/theme/tokens';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;
type WorkKey = keyof typeof workTypeColors;

const workByDay: Record<number, WorkKey[]> = {
  1: ['other', 'harvest'], 2: ['other', 'harvest'], 3: ['other', 'harvest'],
  4: ['other', 'harvest'], 6: ['other', 'harvest'], 7: ['mow', 'other'],
  8: ['other', 'harvest'], 9: ['other', 'harvest'], 10: ['spray', 'harvest'],
};

function Pie({ types, muted = false }: { types: readonly WorkKey[]; muted?: boolean }) {
  if (muted) return <View style={styles.mutedPie} />;
  if (!types.length) return <Svg height={32} width={32}><Circle cx={16} cy={16} r={12} fill="none" stroke={colors.primary} strokeDasharray="4 4" strokeWidth={3} /></Svg>;
  const radius = 7.5;
  const circumference = 2 * Math.PI * radius;
  const each = circumference / types.length;
  return <Svg height={32} width={32} viewBox="0 0 32 32">
    {types.map((type, index) => <Circle key={type + index} cx={16} cy={16} r={radius} fill="none" transform="rotate(-90 16 16)" stroke={workTypeColors[type]} strokeDasharray={each + ' ' + (circumference - each)} strokeDashoffset={-index * each} strokeWidth={15} />)}
  </Svg>;
}

function Day({ day, selected, emptyMode, onPress }: { day: number; selected: boolean; emptyMode: boolean; onPress: () => void }) {
  const column = (day + 3) % 7;
  const dayColor = selected ? colors.primary : column === 0 ? colors.sunday : column === 6 ? colors.saturday : colors.textSub;
  const muted = emptyMode && day >= 11 && day !== 12;
  return <Pressable onPress={onPress} style={styles.day}>
    {selected && <View style={styles.selectedDay} />}
    <Pie types={workByDay[day] ?? []} muted={muted} />
    <AppText style={[styles.dayNumber, { color: dayColor, fontFamily: selected ? fonts.bold : fonts.medium }]}>{String(day).padStart(2, '0')}</AppText>
  </Pressable>;
}

export default function ScheduleScreen() {
  const [day, setDay] = useState(10);
  const empty = day === 12;
  const weekday = ['木', '金', '土', '日', '月', '火', '水'][(day - 1) % 7];

  return <View style={styles.page}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.monthNav}>
        <Pressable accessibilityLabel="前の月" style={styles.monthButton}><Image source={require('../../../assets/icons/chevron-left.svg')} contentFit="fill" style={styles.monthIcon} /></Pressable>
        <View style={styles.month}>
          <AppText style={styles.monthYear}>2026年</AppText>
          <AppText style={styles.monthTitle}>10月</AppText>
        </View>
        <Pressable accessibilityLabel="次の月" style={styles.monthButton}><Image source={require('../../../assets/icons/chevron-left.svg')} contentFit="fill" style={styles.nextIcon} /></Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.calendar}>
          <View style={styles.week}>
            {['日', '月', '火', '水', '木', '金', '土'].map((label, index) => <AppText key={label} variant="bodyLg" style={[styles.weekLabel, index === 0 && styles.sunday, index === 6 && styles.saturday]}>{label}</AppText>)}
          </View>
          <View style={styles.days}>
            {Array.from({ length: 4 }, (_, index) => <View key={'blank-' + index} style={styles.day} />)}
            {Array.from({ length: 31 }, (_, index) => <Day key={index + 1} day={index + 1} selected={day === index + 1} emptyMode={empty} onPress={() => setDay(index + 1)} />)}
          </View>
          <WorkTypeLegend items={[
            { type: 'thinning', label: '摘果・摘葉' }, { type: 'harvest', label: '収穫' },
            { type: 'irrigate', label: '灌水' }, { type: 'spray', label: '防除' },
            { type: 'fertilize', label: '肥料' }, { type: 'mow', label: '草刈り' },
            { type: 'other', label: 'その他' },
          ]} />
        </View>

        <View style={styles.daySchedule}>
          <AppText variant="bodyLgBold">10月{day}日（{weekday}）の予定</AppText>
          {empty ? <View style={styles.empty}>
            <Image source={require('../../../assets/images/empty-schedule-character-2.png')} contentFit="cover" style={styles.emptyCharacter} />
            <View style={styles.emptyMessage}>
              <AppText>まだ予定はありません</AppText>
              <Button label="予定を入れる" variant="secondary" size="md" onPress={() => router.push({ pathname: '/schedule/new', params: { day } })} style={styles.emptyButton} />
            </View>
          </View> : <ScheduleCarousel schedules={[
            { id: '1', start: '08:00', end: '11:30', work: '収穫', workType: 'harvest', place: 'すだち農園', members: ['野﨑'] },
            { id: '2', start: '13:00', end: '14:30', work: '防除', workType: 'spray', place: 'すだち農園', members: ['長谷川', '野﨑'] },
            { id: '3', start: '13:00', end: '14:30', work: '防除', workType: 'spray', place: 'すだち農園', members: ['長谷川', '野﨑'] },
          ]} />}
        </View>
      </View>
      <BottomNav role="worker" activeTab="schedule" onTabPress={(tab) => router.navigate(routes[tab])} />
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  page: { alignSelf: 'center', backgroundColor: colors.surface, flex: 1, maxWidth: 360, width: '100%' },
  safe: { flex: 1, paddingBottom: 10 },
  monthNav: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 4, paddingHorizontal: 12, paddingTop: 16 },
  monthButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.full, height: 48, justifyContent: 'center', overflow: 'hidden', width: 48 },
  monthIcon: { height: 59, width: 59 },
  nextIcon: { height: 59, transform: [{ rotate: '180deg' }], width: 59 },
  month: { alignItems: 'center', width: 80 },
  monthYear: { fontFamily: fonts.medium, fontSize: 23, lineHeight: 25 },
  monthTitle: { fontFamily: fonts.medium, fontSize: 35, lineHeight: 42 },
  content: { flex: 1, gap: 12, overflow: 'hidden', paddingBottom: 8, paddingLeft: 16 },
  calendar: { gap: 12, paddingRight: 16 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekLabel: { color: colors.textSub, textAlign: 'center', width: 31 },
  sunday: { color: colors.sunday },
  saturday: { color: colors.saturday },
  days: { columnGap: 18, flexDirection: 'row', flexWrap: 'wrap', rowGap: 19 },
  day: { alignItems: 'center', height: 55, position: 'relative', width: 31 },
  selectedDay: { backgroundColor: colors.primarySoft, borderRadius: radii.md, bottom: -2, left: -4, position: 'absolute', right: -4, top: -2 },
  dayNumber: { fontSize: 23, lineHeight: 25, textAlign: 'center' },
  mutedPie: { backgroundColor: '#AEAEAE', borderRadius: radii.full, height: 31, width: 31 },
  daySchedule: { gap: 8 },
  empty: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingRight: 16 },
  emptyCharacter: { height: 80, width: 118 },
  emptyMessage: { flex: 1, gap: 8 },
  emptyButton: { alignSelf: 'stretch', height: 48, width: '100%' },
});
