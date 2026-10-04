import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WorkFlowFooter, WorkPage, WorkTitleHeader, workTextStyles } from '@/components/work/figma-work-ui';
import { colors, radii, strokes } from '@/theme/tokens';

type Schedule = { start: string; end: string; work: string; place: string; members: string };

const schedules: readonly Schedule[] = [
  { start: '08:00', end: '11:30', work: '収穫', place: 'すだち農園', members: '野﨑・長谷川・永田' },
  { start: '13:00', end: '14:30', work: '防除', place: 'すだち農園', members: '野﨑・長谷川・大久保' },
] as const;

export default function WorkStartScreen() {
  const startScheduledWork = (schedule: Schedule = schedules[0]) => {
    router.push({ pathname: '/work/plot', params: { plot: schedule.place, work: schedule.work } });
  };

  return (
    <WorkPage
      header={<WorkTitleHeader title="作業を始める" />}
      footer={<WorkFlowFooter onBack={() => router.back()} onNext={() => startScheduledWork()} />}
      testID="work-start-screen">
      <View style={styles.section}>
        <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.bodyLg, styles.center]}>カレンダーから選ぶ</Text>
        <View style={styles.cards}>
          {schedules.map((schedule) => (
            <ScheduleChoice key={schedule.start} {...schedule} onPress={() => startScheduledWork(schedule)} />
          ))}
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/work/plot')} style={({ pressed }) => [styles.newWork, pressed && styles.pressed]}>
        <Text maxFontSizeMultiplier={1.2} style={workTextStyles.bodyLg}>新しく始める</Text>
      </Pressable>
    </WorkPage>
  );
}

function ScheduleChoice({ start, end, work, place, members, onPress }: Schedule & { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.timeRow}>
        <Text maxFontSizeMultiplier={1.2} style={workTextStyles.body}>{start}</Text>
        <View style={styles.timeLine} />
        <Text maxFontSizeMultiplier={1.2} style={workTextStyles.body}>{end}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.2} style={workTextStyles.bodyLg}>{work}</Text>
      <View style={styles.details}>
        <View style={styles.detailRow}><Text maxFontSizeMultiplier={1.2} style={workTextStyles.small}>場所</Text><Text maxFontSizeMultiplier={1.2} style={workTextStyles.caption}>{place}</Text></View>
        <View style={styles.detailRow}><Text maxFontSizeMultiplier={1.2} style={workTextStyles.small}>担当</Text><Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[workTextStyles.caption, styles.members]}>{members}</Text></View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { alignSelf: 'stretch', gap: 38 },
  center: { textAlign: 'center' },
  cards: { gap: 9 },
  card: { alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, gap: 12, minHeight: 142, paddingBottom: 10, paddingHorizontal: 11, paddingTop: 8 },
  timeRow: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  timeLine: { backgroundColor: colors.text, height: 1, width: 40 },
  details: { gap: 3 },
  detailRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 13 },
  members: { flexShrink: 1 },
  newWork: { marginTop: 25 },
  pressed: { opacity: 0.7 },
});
