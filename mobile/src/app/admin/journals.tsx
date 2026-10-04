import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminFlowFooter, AdminHeader, AdminIconButton, AdminPage, adminTextStyles } from '@/components/admin/figma-admin-ui';
import { colors, fonts, radii } from '@/theme/tokens';

const days = Array.from({ length: 31 }, (_, index) => index + 1);
const leadingBlanks = Array.from({ length: 4 }, (_, index) => index);

export default function JournalsScreen() {
  return (
    <AdminPage
      header={<><AdminHeader compact title="農園日誌" /><MonthNav /></>}
      contentStyle={styles.content}
      footer={<AdminFlowFooter onBack={() => router.back()} onNext={() => router.push('/admin/journals/pdf')} nextLabel="PDFを出力" nextVariant="cta" />}
      testID="journal-calendar-screen">
      <View style={styles.calendar}>
        <View style={styles.weekdays}>{['日', '月', '火', '水', '木', '金', '土'].map((weekday) => <Text key={weekday} maxFontSizeMultiplier={1.2} style={styles.weekday}>{weekday}</Text>)}</View>
        <View style={styles.grid}>
          {leadingBlanks.map((blank) => <View key={`blank-${blank}`} style={styles.calendarDay} />)}
          {days.map((day) => <CalendarDate key={day} day={day} />)}
        </View>
      </View>
      <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.caption}>日付を押すと、その日の日誌を見られます</Text>
    </AdminPage>
  );
}

function MonthNav() {
  return (
    <View style={styles.monthNav}>
      <AdminIconButton onPress={() => undefined} />
      <View style={styles.monthCopy}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>2026年</Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.month}>10月</Text>
      </View>
      <AdminIconButton direction="forward" onPress={() => undefined} />
    </View>
  );
}

function CalendarDate({ day }: { day: number }) {
  const column = (day + 3) % 7;
  const isSunday = column === 0;
  const isSaturday = column === 6;
  const isToday = day === 10;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`10月${day}日の日誌を見る`} onPress={() => router.push({ pathname: '/admin/journals/day', params: { day } })} style={({ pressed }) => [styles.calendarDay, pressed && styles.pressed]}>
      {isToday ? <View style={styles.selected} /> : null}
      <Image source={require('../../../assets/images/admin/calendar-segment.svg')} style={styles.pie} contentFit="fill" accessible={false} />
      <Text maxFontSizeMultiplier={1.2} style={[styles.date, isSunday && styles.sunday, isSaturday && styles.saturday, isToday && styles.today]}>{String(day).padStart(2, '0')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  monthNav: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, width: '100%' },
  monthCopy: { alignItems: 'center', width: 67 },
  month: { color: colors.text, fontFamily: fonts.medium, fontSize: 35, includeFontPadding: false, lineHeight: 45, textAlign: 'center' },
  content: { alignItems: 'center', gap: 12, paddingBottom: 8, paddingHorizontal: 16, paddingTop: 8 },
  calendar: { alignSelf: 'stretch', gap: 19 },
  weekdays: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  weekday: { color: colors.textSub, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 25, textAlign: 'center', width: 31.714 },
  grid: { flexDirection: 'row', columnGap: 17, rowGap: 19, flexWrap: 'wrap', width: '100%' },
  calendarDay: { alignItems: 'center', height: 55, position: 'relative', width: 31.714 },
  selected: { backgroundColor: colors.primarySoft, borderRadius: radii.md, bottom: -2, left: -4, position: 'absolute', right: -4, top: -2 },
  pie: { height: 31, width: 31.714 },
  date: { color: colors.textSub, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 25, textAlign: 'center' },
  sunday: { color: colors.sunday },
  saturday: { color: colors.saturday },
  today: { color: colors.primary, fontFamily: fonts.bold },
  pressed: { opacity: 0.7 },
});
