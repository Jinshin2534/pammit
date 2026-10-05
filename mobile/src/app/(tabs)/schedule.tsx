import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { errorMessage, useSchedules } from '@/api';
import type { Schedule } from '@/api/types';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScheduleCarousel, ScheduleDetailSheet, toScheduleCards, workTypesOf, WorkTypeLegend } from '@/components/schedule';
import { AppText, Button } from '@/components/ui';
import { workTypeKeys, workTypeLabel } from '@/lib/work-types';
import { useCurrentUser } from '@/providers/auth';
import { colors, fonts, radii, workTypeColors } from '@/theme/tokens';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;
type WorkKey = keyof typeof workTypeColors;

// 凡例は8種類。「その他」を最後にする
const legendItems = [...workTypeKeys.filter((key) => key !== 'other'), 'other' as const].map((type) => ({ type, label: workTypeLabel(type) }));

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

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

function Day({ day, firstWeekday, selected, types, onPress }: { day: number; firstWeekday: number; selected: boolean; types: readonly WorkKey[]; onPress: () => void }) {
  const column = (firstWeekday + day - 1) % 7;
  const dayColor = selected ? colors.primary : column === 0 ? colors.sunday : column === 6 ? colors.saturday : colors.textSub;
  return <Pressable onPress={onPress} style={styles.day}>
    <View style={styles.dayInner}>
      {selected && <View style={styles.selectedDay} />}
      <View style={styles.dayVisual}><Pie types={types} /></View>
      <AppText style={[styles.dayNumber, { color: dayColor, fontFamily: selected ? fonts.bold : fonts.medium }]}>{String(day).padStart(2, '0')}</AppText>
    </View>
  </Pressable>;
}

export default function ScheduleScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const role = useCurrentUser()?.role ?? 'worker';
  const today = useMemo(() => new Date(), []);
  const latestMonth = useMemo(() => addMonths(startOfMonth(today), 6), [today]);
  const requestedDate = useMemo(() => dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? new Date(`${dateParam}T12:00:00`) : null, [dateParam]);
  const [month, setMonth] = useState(() => startOfMonth(requestedDate ?? today));
  const [day, setDay] = useState(() => (requestedDate ?? today).getDate());
  const [openScheduleId, setOpenScheduleId] = useState<number | null>(null);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlankDays = month.getDay();
  const canMoveNext = month.getTime() < latestMonth.getTime();
  const selectedDate = new Date(month.getFullYear(), month.getMonth(), day);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][selectedDate.getDay()];
  const selectedDateKey = dateKey(month.getFullYear(), month.getMonth() + 1, day);

  // ほかの画面から date を付けて開き直したときは、その日を選ぶ
  const [syncedDate, setSyncedDate] = useState(requestedDate);
  if (requestedDate !== syncedDate) {
    setSyncedDate(requestedDate);
    if (requestedDate) {
      setMonth(startOfMonth(requestedDate));
      setDay(requestedDate.getDate());
    }
  }

  const monthQuery = useSchedules(dateKey(month.getFullYear(), month.getMonth() + 1, 1), dateKey(month.getFullYear(), month.getMonth() + 1, daysInMonth));
  const schedulesByDate = useMemo(() => {
    const byDate = new Map<string, Schedule[]>();
    for (const schedule of monthQuery.data ?? []) byDate.set(schedule.date, [...(byDate.get(schedule.date) ?? []), schedule]);
    return byDate;
  }, [monthQuery.data]);
  const daySchedules = schedulesByDate.get(selectedDateKey) ?? [];
  const dayCards = toScheduleCards(daySchedules);
  const openSchedule = monthQuery.data?.find((schedule) => schedule.id === openScheduleId) ?? null;

  const workTypesForDay = (dayNumber: number): WorkKey[] => workTypesOf(schedulesByDate.get(dateKey(month.getFullYear(), month.getMonth() + 1, dayNumber)) ?? []);

  const editSchedule = (schedule: Schedule) => {
    setOpenScheduleId(null);
    router.push({ pathname: '/schedule/new', params: { id: String(schedule.id), date: schedule.date } });
  };

  const moveMonth = (amount: number) => {
    const next = addMonths(month, amount);
    if (amount > 0 && next.getTime() > latestMonth.getTime()) return;
    setMonth(next);
    setDay((current) => Math.min(current, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  };

  return <View style={styles.page}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.monthNav}>
        <Pressable accessibilityLabel="前の月" accessibilityRole="button" onPress={() => moveMonth(-1)} style={styles.monthButton}><Image source={require('../../../assets/icons/chevron-left.svg')} contentFit="fill" style={styles.monthIcon} /></Pressable>
        <View style={styles.month}>
          <AppText style={styles.monthYear}>{month.getFullYear()}年</AppText>
          <AppText style={styles.monthTitle}>{month.getMonth() + 1}月</AppText>
        </View>
        <Pressable accessibilityLabel="次の月" accessibilityRole="button" accessibilityState={{ disabled: !canMoveNext }} disabled={!canMoveNext} onPress={() => moveMonth(1)} style={[styles.monthButton, !canMoveNext && styles.monthButtonDisabled]}><Image source={require('../../../assets/icons/chevron-left.svg')} contentFit="fill" style={styles.nextIcon} /></Pressable>
      </View>

      <ScrollView style={styles.scroller} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.calendar}>
          <View style={styles.week}>
            {['日', '月', '火', '水', '木', '金', '土'].map((label, index) => <AppText key={label} variant="bodyLg" style={[styles.weekLabel, index === 0 && styles.sunday, index === 6 && styles.saturday]}>{label}</AppText>)}
          </View>
          <View style={styles.days}>
            {Array.from({ length: leadingBlankDays }, (_, index) => <View key={'blank-' + index} style={styles.day} />)}
            {Array.from({ length: daysInMonth }, (_, index) => <Day key={index + 1} day={index + 1} firstWeekday={leadingBlankDays} selected={day === index + 1} types={workTypesForDay(index + 1)} onPress={() => setDay(index + 1)} />)}
          </View>
          <WorkTypeLegend items={legendItems} />
        </View>

        <View style={styles.daySchedule}>
          <AppText variant="bodyLgBold">{month.getMonth() + 1}月{day}日（{weekday}）の予定</AppText>
          {monthQuery.isError && !monthQuery.data ? <AppText style={styles.error}>{errorMessage(monthQuery.error)}</AppText> : null}
          {!dayCards.length ? <View style={styles.empty}>
            <Image source={require('../../../assets/images/empty-schedule-character-2.png')} contentFit="cover" style={styles.emptyCharacter} />
            <View style={styles.emptyMessage}>
              <AppText>まだ予定はありません</AppText>
              <Button label="予定を入れる" variant="secondary" size="md" onPress={() => router.push({ pathname: '/schedule/new', params: { date: selectedDateKey } })} style={styles.emptyButton} />
            </View>
          </View> : <ScheduleCarousel
            schedules={dayCards}
            addLabel="＋予定の追加"
            onAdd={() => router.push({ pathname: '/schedule/new', params: { date: selectedDateKey } })}
            onSchedulePress={(id) => setOpenScheduleId(dayCards.find((card) => card.id === id)?.scheduleId ?? null)}
          />}
        </View>
      </ScrollView>
      <ScheduleDetailSheet schedule={openSchedule} onClose={() => setOpenScheduleId(null)} onEdit={editSchedule} testID="schedule-detail-sheet" />
      <BottomNav role={role} activeTab="schedule" onTabPress={(tab) => router.navigate(routes[tab])} />
    </SafeAreaView>
  </View>;
}

// 1週間を7等分して、画面幅に合わせて日付の間隔を広げる
const DAY_COLUMN = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  page: { alignSelf: 'center', backgroundColor: colors.surface, flex: 1, maxWidth: Platform.OS === 'web' ? 360 : undefined, width: '100%' },
  safe: { flex: 1, paddingBottom: 10 },
  monthNav: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 4, paddingHorizontal: 12, paddingTop: 16 },
  monthButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.full, height: 48, justifyContent: 'center', overflow: 'hidden', width: 48 },
  monthButtonDisabled: { backgroundColor: colors.disabled, opacity: 0.65 },
  monthIcon: { height: 59, width: 59 },
  nextIcon: { height: 59, transform: [{ rotate: '180deg' }], width: 59 },
  month: { alignItems: 'center', flexShrink: 1, minWidth: 67, paddingHorizontal: 4 },
  monthYear: { fontFamily: fonts.medium, fontSize: 23, lineHeight: 25 },
  monthTitle: { fontFamily: fonts.medium, fontSize: 35, lineHeight: 42 },
  scroller: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, gap: 12, paddingBottom: 24, paddingLeft: 16 },
  calendar: { gap: 12, paddingRight: 16 },
  week: { flexDirection: 'row' },
  weekLabel: { color: colors.textSub, textAlign: 'center', width: DAY_COLUMN },
  sunday: { color: colors.sunday },
  saturday: { color: colors.saturday },
  days: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 19 },
  day: { alignItems: 'center', height: 55, width: DAY_COLUMN },
  dayInner: { alignItems: 'center', height: 55, position: 'relative', width: 31.714 },
  selectedDay: { backgroundColor: colors.primarySoft, borderRadius: radii.md, bottom: -2, left: -4, position: 'absolute', right: -4, top: -2, zIndex: 0 },
  dayVisual: { position: 'relative', zIndex: 1 },
  dayNumber: { fontSize: 23, lineHeight: 25, position: 'relative', textAlign: 'center', zIndex: 1 },
  mutedPie: { backgroundColor: '#AEAEAE', borderRadius: radii.full, height: 31, width: 31.714 },
  daySchedule: { alignSelf: 'stretch', gap: 8, paddingRight: 16 },
  empty: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingRight: 16 },
  emptyCharacter: { height: 80, width: 118 },
  emptyMessage: { flex: 1, gap: 8 },
  error: { color: colors.cta },
  emptyButton: { alignSelf: 'stretch', height: 48, width: '100%' },
});
