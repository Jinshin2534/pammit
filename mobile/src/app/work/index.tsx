import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage, useStartableSchedules, useWorkOutbox, type WorkSchedule } from '@/api';
import { WorkFlowFooter, WorkPage, WorkTitleHeader, workTextStyles } from '@/components/work/figma-work-ui';
import { flowParams, scheduleWorkTypesParam } from '@/components/work/work-flow-params';
import { fromApiTime, todayJst } from '@/lib/datetime';
import { useCurrentUser } from '@/providers/auth';
import { colors, radii, strokes } from '@/theme/tokens';

/** 「長谷川 真白」→「長谷川」 */
function familyName(name: string) {
  return name.split(/[\s　]+/)[0] || name;
}

export default function WorkStartScreen() {
  const me = useCurrentUser();
  const schedules = useStartableSchedules(todayJst(), me?.id);
  const outbox = useWorkOutbox(me?.id);
  const blocked = outbox.hasPendingFinish;

  const startScheduledWork = (schedule: WorkSchedule) => {
    router.push({
      pathname: '/work/plot',
      params: flowParams({
        scheduleId: String(schedule.id),
        plotId: String(schedule.plot_id),
        plotName: schedule.plot_name,
        workTypes: scheduleWorkTypesParam(schedule.work_types),
      }),
    });
  };
  const startNewWork = () => router.push('/work/plot');

  return (
    <WorkPage
      header={<WorkTitleHeader title="作業を始める" />}
      footer={<WorkFlowFooter onBack={() => router.back()} onNext={startNewWork} nextDisabled={blocked} />}
      scrollable
      testID="work-start-screen">
      {blocked ? (
        <Text accessibilityRole="alert" maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.notice]}>
          {'同期待ちの作業があります。\n通信がつながって送り終わるまで、新しい作業は始められません'}
        </Text>
      ) : null}
      <View style={styles.section}>
        <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.bodyLg, styles.center]}>カレンダーから選ぶ</Text>
        <View style={styles.cards}>
          {schedules.isPending ? (
            <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center]}>予定を読み込んでいます</Text>
          ) : schedules.isError ? (
            <Pressable accessibilityRole="button" onPress={() => void schedules.refetch()} style={({ pressed }) => pressed && styles.pressed}>
              <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center]}>{`${errorMessage(schedules.error)}\n（押すと読み込み直します）`}</Text>
            </Pressable>
          ) : schedules.data.length === 0 ? (
            <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center]}>今日の予定はありません</Text>
          ) : (
            schedules.data.map((schedule) => (
              <ScheduleChoice key={schedule.id} schedule={schedule} disabled={blocked} onPress={() => startScheduledWork(schedule)} />
            ))
          )}
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: blocked }} disabled={blocked} onPress={startNewWork} style={({ pressed }) => [styles.newWork, pressed && styles.pressed]}>
        <Text maxFontSizeMultiplier={1.2} style={workTextStyles.bodyLg}>新しく始める</Text>
      </Pressable>
    </WorkPage>
  );
}

function ScheduleChoice({ schedule, disabled, onPress }: { schedule: WorkSchedule; disabled: boolean; onPress: () => void }) {
  const members = schedule.assignees.length > 0 ? schedule.assignees.map((assignee) => familyName(assignee.name)).join('・') : 'なし';
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.timeRow}>
        <Text maxFontSizeMultiplier={1.2} style={workTextStyles.body}>{fromApiTime(schedule.start_time) ?? '--:--'}</Text>
        <View style={styles.timeLine} />
        <Text maxFontSizeMultiplier={1.2} style={workTextStyles.body}>{fromApiTime(schedule.end_time) ?? '--:--'}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.2} style={workTextStyles.bodyLg}>{schedule.work_types.join(' / ')}</Text>
      <View style={styles.details}>
        <View style={styles.detailRow}><Text maxFontSizeMultiplier={1.2} style={workTextStyles.small}>場所</Text><Text maxFontSizeMultiplier={1.2} style={workTextStyles.caption}>{schedule.plot_name}</Text></View>
        <View style={styles.detailRow}><Text maxFontSizeMultiplier={1.2} style={workTextStyles.small}>担当</Text><Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[workTextStyles.caption, styles.members]}>{members}</Text></View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { alignSelf: 'stretch', gap: 38 },
  center: { textAlign: 'center' },
  notice: { color: colors.cta, textAlign: 'center' },
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
