import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminFlowFooter, AdminHeader, AdminIconButton, AdminPage, adminTextStyles } from '@/components/admin/figma-admin-ui';
import { colors, fonts, radii } from '@/theme/tokens';
import { useAppState } from '@/providers/app-state';

const todayMonth = new Date(2026, 9, 1);
const maxMonth = new Date(2027, 3, 1);
const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const dateKey = (date: Date, day: number) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export default function JournalsScreen() {
  const [month, setMonth] = useState(todayMonth);
  const { journalEntries } = useAppState();
  const days = useMemo(() => Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => index + 1), [month]);
  const leadingBlanks = useMemo(() => Array.from({ length: month.getDay() }, (_, index) => index), [month]);
  const canGoForward = month < maxMonth;
  return (
    <AdminPage
      header={<><AdminHeader compact title="農園日誌" /><MonthNav month={month} onBack={() => setMonth((current) => addMonths(current, -1))} onForward={() => canGoForward && setMonth((current) => addMonths(current, 1))} canGoForward={canGoForward} /></>}
      contentStyle={styles.content}
      footer={<AdminFlowFooter onBack={() => router.back()} onNext={() => router.push('/admin/journals/pdf')} nextLabel="PDFを出力" nextVariant="cta" />}
      testID="journal-calendar-screen">
      <View style={styles.calendar}>
        <View style={styles.weekdays}>{['日', '月', '火', '水', '木', '金', '土'].map((weekday) => <Text key={weekday} maxFontSizeMultiplier={1.2} style={styles.weekday}>{weekday}</Text>)}</View>
        <View style={styles.grid}>
          {leadingBlanks.map((blank) => <View key={`blank-${blank}`} style={styles.calendarDay} />)}
          {days.map((day) => <CalendarDate key={day} day={day} month={month} hasEntry={journalEntries.some((entry) => entry.date === dateKey(month, day) && entry.note.trim())} />)}
        </View>
      </View>
      <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.caption}>日付を押すと、その日の日誌を見られます</Text>
    </AdminPage>
  );
}

function MonthNav({ month, onBack, onForward, canGoForward }: { month: Date; onBack: () => void; onForward: () => void; canGoForward: boolean }) {
  return (
    <View style={styles.monthNav}>
      <AdminIconButton onPress={onBack} />
      <View style={styles.monthCopy}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>{month.getFullYear()}年</Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.month}>{month.getMonth() + 1}月</Text>
      </View>
      <View style={!canGoForward && styles.disabled}><AdminIconButton direction="forward" onPress={onForward} /></View>
    </View>
  );
}

function CalendarDate({ day, month, hasEntry }: { day: number; month: Date; hasEntry: boolean }) {
  const column = new Date(month.getFullYear(), month.getMonth(), day).getDay();
  const isSunday = column === 0;
  const isSaturday = column === 6;
  const isToday = month.getFullYear() === 2026 && month.getMonth() === 9 && day === 5;
  const key = dateKey(month, day);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${month.getMonth() + 1}月${day}日の日誌を見る`} onPress={() => router.push({ pathname: '/admin/journals/day', params: { date: key } })} style={({ pressed }) => [styles.calendarDay, pressed && styles.pressed]}>
      <View style={styles.dayInner}>
        {isToday ? <View style={styles.selected} /> : null}
        <View style={[styles.pie, hasEntry ? styles.entryDot : styles.emptyDot]} />
        <Text maxFontSizeMultiplier={1.2} style={[styles.date, isSunday && styles.sunday, isSaturday && styles.saturday, isToday && styles.today]}>{String(day).padStart(2, '0')}</Text>
      </View>
    </Pressable>
  );
}

const DAY_COLUMN = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  monthNav: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, width: '100%' },
  monthCopy: { alignItems: 'center', flexShrink: 1, minWidth: 67, paddingHorizontal: 4 },
  month: { color: colors.text, fontFamily: fonts.medium, fontSize: 35, includeFontPadding: false, lineHeight: 45, textAlign: 'center' },
  content: { alignItems: 'center', gap: 12, paddingBottom: 8, paddingHorizontal: 16, paddingTop: 8 },
  calendar: { alignSelf: 'stretch', gap: 19 },
  weekdays: { alignItems: 'center', flexDirection: 'row', width: '100%' },
  weekday: { color: colors.textSub, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 25, textAlign: 'center', width: DAY_COLUMN },
  grid: { flexDirection: 'row', rowGap: 19, flexWrap: 'wrap', width: '100%' },
  calendarDay: { alignItems: 'center', height: 55, width: DAY_COLUMN },
  dayInner: { alignItems: 'center', height: 55, position: 'relative', width: 32.286 },
  selected: { backgroundColor: colors.primarySoft, borderRadius: radii.md, bottom: -2, left: -4, position: 'absolute', right: -4, top: -2 },
  pie: { borderRadius: radii.full, height: 31, width: 31 },
  date: { color: colors.textSub, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 25, textAlign: 'center' },
  sunday: { color: colors.sunday },
  saturday: { color: colors.saturday },
  today: { color: colors.primary, fontFamily: fonts.bold },
  pressed: { opacity: 0.7 },
  entryDot: { backgroundColor: colors.primary },
  emptyDot: { borderColor: colors.primary, borderStyle: 'dashed', borderWidth: 3 },
  disabled: { opacity: 0.28 },
});
