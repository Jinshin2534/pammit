// 予定のカードを押したときに下から開く詳細。すべての作業・担当・備考と、作った人と owner には編集・削除を出す。
// 画面の上に Modal で重ねるので、閉じても下の画面（月・選んだ日・スクロール位置）はそのまま。
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage, isApiError, useDeleteSchedule } from '@/api';
import type { Schedule } from '@/api/types';
import { Dialog } from '@/components/feedback/dialog';
import { Toast } from '@/components/feedback/toast';
import { AppText, Button } from '@/components/ui';
import { fromApiWorkType, workTypeLabel } from '@/lib/work-types';
import { useCurrentUser } from '@/providers/auth';
import { colors, radii, workTypeColors } from '@/theme/tokens';

import { scheduleTime } from './schedule-items';

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

export type ScheduleDetailSheetProps = {
  /** null で閉じる */
  schedule: Schedule | null;
  onClose: () => void;
  onEdit: (schedule: Schedule) => void;
  testID?: string;
};

/** 予定を変える・消すのは作った人と owner だけ */
export function canEditSchedule(schedule: Schedule, user: { id: number; role: string } | null | undefined) {
  if (!user) return false;
  return user.role === 'owner' || schedule.created_by.id === user.id;
}

export function ScheduleDetailSheet({ schedule, onClose, onEdit, testID }: ScheduleDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const me = useCurrentUser();
  const deleteMutation = useDeleteSchedule();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 閉じるアニメーションのあいだも中身を出しておく
  const [shown, setShown] = useState<Schedule | null>(schedule);
  const [previous, setPrevious] = useState<Schedule | null>(schedule);
  if (schedule !== previous) {
    setPrevious(schedule);
    if (schedule) setShown(schedule);
    setConfirming(false);
    setError(null);
  }

  const canEdit = shown ? canEditSchedule(shown, me) : false;

  const remove = () => {
    if (!shown) return;
    setConfirming(false);
    setError(null);
    deleteMutation.mutate(shown.id, {
      onSuccess: onClose,
      onError: (cause) => {
        // すでに消されていたら、一覧は読み直されているので閉じるだけ
        if (isApiError(cause, 'schedule_not_found')) onClose();
        else setError(errorMessage(cause));
      },
    });
  };

  const date = shown ? new Date(`${shown.date}T12:00:00`) : null;

  return (
    <Modal transparent visible={schedule !== null} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="予定の詳細を閉じる" onPress={onClose} style={styles.backdrop} />
        {shown && date ? (
          <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]} testID={testID}>
            <View style={styles.handle} />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
              <View style={styles.titleBlock}>
                <AppText variant="bodyLgBold">
                  {date.getMonth() + 1}月{date.getDate()}日（{weekdays[date.getDay()]}）
                </AppText>
                <AppText variant="bodyLg">
                  {scheduleTime(shown.start_time)}〜{scheduleTime(shown.end_time)}
                </AppText>
              </View>

              <DetailRow label="場所" value={shown.plot_name} />
              <View style={styles.row}>
                <AppText variant="small" style={styles.label}>作業</AppText>
                <View style={styles.workTypes}>
                  {shown.work_types.map((type) => {
                    const key = fromApiWorkType(type);
                    return (
                      <View key={type} style={styles.workType}>
                        <View style={[styles.workColor, { backgroundColor: workTypeColors[key] }]} />
                        <AppText>{workTypeLabel(key)}</AppText>
                      </View>
                    );
                  })}
                </View>
              </View>
              <DetailRow label="担当" value={shown.assignees.map((assignee) => assignee.name).join('・') || '未指定'} />
              <DetailRow label="備考" value={shown.note?.trim() || 'なし'} />
              <DetailRow label="入力" value={shown.created_by.name} />

              <Toast visible={error !== null} kind="error" message={error ?? ''} />

              {canEdit ? (
                <View style={styles.actions}>
                  <Button label="編集する" variant="primary" onPress={() => onEdit(shown)} disabled={deleteMutation.isPending} style={styles.action} testID="schedule-detail-edit" />
                  <Button label="削除する" variant="cta" onPress={() => setConfirming(true)} loading={deleteMutation.isPending} style={styles.action} testID="schedule-detail-delete" />
                </View>
              ) : null}
              <Button label="閉じる" variant="secondary" onPress={onClose} testID="schedule-detail-close" />
            </ScrollView>

            <Dialog
              visible={confirming}
              title="この予定を削除しますか？"
              body="削除すると元に戻せません"
              confirmLabel="削除する"
              cancelLabel="やめる"
              onConfirm={remove}
              onCancel={() => setConfirming(false)}
              testID="schedule-delete-dialog"
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="small" style={styles.label}>{label}</AppText>
      <AppText style={styles.value}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  sheet: { alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: radii.md, borderTopRightRadius: radii.md, maxHeight: '85%', maxWidth: 480, paddingHorizontal: 24, paddingTop: 12, width: '100%' },
  handle: { alignSelf: 'center', backgroundColor: colors.disabled, borderRadius: radii.full, height: 5, marginBottom: 12, width: 48 },
  scroll: { flexGrow: 0 },
  content: { gap: 16 },
  titleBlock: { gap: 4 },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: 16 },
  label: { lineHeight: 20, paddingTop: 2, width: 32 },
  value: { flex: 1, lineHeight: 22 },
  workTypes: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 8 },
  workType: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  workColor: { borderRadius: radii.full, height: 19, width: 19 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1 },
});
