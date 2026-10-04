import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminHeader, AdminPage, AdminTextField, adminTextStyles } from '@/components/admin/figma-admin-ui';
import { colors, radii } from '@/theme/tokens';

export default function JournalDayScreen() {
  const { day = '10' } = useLocalSearchParams<{ day?: string }>();
  const [note, setNote] = useState('午後から風が強くなった');

  return (
    <AdminPage bottomNav header={<AdminHeader showBack title={`10/${day}（土）`} onBack={() => router.back()} />} contentStyle={styles.content} testID="journal-day-screen">
      <View style={styles.summary}>
        <Metric label="天気" value="晴れ" note="朝の予報" />
        <Metric label="気温" value="28℃" note="最低 18℃" />
        <Metric label="作業人数" value="3人" note="　" />
      </View>
      <View style={styles.works}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>作業</Text>
        <ScheduleCard start="08:00" end="11:30" work="収穫" place="三番ハウス" people="野﨑・永田" />
        <ScheduleCard start="13:00" end="14:30" work="防除" place="すだち農園" people="長谷川" />
      </View>
      <AdminTextField label="備考" value={note} onChangeText={setNote} />
    </AdminPage>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={styles.metric}>
      <Text maxFontSizeMultiplier={1.2} style={styles.metricLabel}>{label}</Text>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.metricValue}>{value}</Text>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.metricNote}>{note}</Text>
    </View>
  );
}

function ScheduleCard({ start, end, work, place, people }: { start: string; end: string; work: string; place: string; people: string }) {
  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.scheduleCard, pressed && styles.pressed]}>
      <View style={styles.timeRow}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.body}>{start}</Text>
        <View style={styles.timeLine} />
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.body}>{end}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.2} style={styles.workTitle}>{work}</Text>
      <View style={styles.meta}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.body}>場所　{place}</Text>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.body}>担当　{people}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'flex-start', paddingHorizontal: 16 },
  summary: { alignSelf: 'stretch', flexDirection: 'row', gap: 8 },
  metric: { alignItems: 'flex-start', backgroundColor: colors.primary, borderRadius: radii.md, flex: 1, gap: 2, overflow: 'hidden', padding: 10 },
  metricLabel: { color: colors.text, fontFamily: adminTextStyles.body.fontFamily, fontSize: 13, includeFontPadding: false, lineHeight: 13 },
  metricValue: { color: colors.textInverse, fontFamily: adminTextStyles.bodyLgBold.fontFamily, fontSize: 23, includeFontPadding: false, lineHeight: 25 },
  metricNote: { color: colors.textMutedGreen, fontFamily: adminTextStyles.small.fontFamily, fontSize: 10, includeFontPadding: false, lineHeight: 10 },
  works: { alignSelf: 'stretch', gap: 8 },
  scheduleCard: { alignItems: 'flex-start', alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: radii.md, gap: 12, paddingBottom: 10, paddingHorizontal: 11, paddingTop: 8 },
  timeRow: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  timeLine: { backgroundColor: colors.text, height: 1, width: 40 },
  workTitle: { color: colors.textInverse, fontFamily: adminTextStyles.bodyLg.fontFamily, fontSize: 23, includeFontPadding: false, lineHeight: 25 },
  meta: { gap: 3 },
  pressed: { opacity: 0.7 },
});
