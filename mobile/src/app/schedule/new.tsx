import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  errorMessage,
  isApiError,
  isOfflineError,
  offlineMessage,
  plotKeys,
  scheduleKeys,
  useAssigneeCandidates,
  useCreateSchedule,
  usePlots,
  useSchedules,
  useUpdateSchedule,
} from '@/api';
import type { Schedule } from '@/api/types';
import { HeaderBackground } from '@/components/background/header-background';
import { Toast } from '@/components/feedback/toast';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Button, Dropdown, TextField } from '@/components/ui';
import { fromApiTime, todayJst, toApiTime } from '@/lib/datetime';
import { uuidV4 } from '@/lib/uuid';
import { fromApiWorkType, toApiWorkType, workTypeKeys, workTypeLabel, WorkTypeKey } from '@/lib/work-types';
import { useCurrentUser } from '@/providers/auth';
import { colors, fonts, radii } from '@/theme/tokens';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
const workOptions = workTypeKeys.map((key) => ({ label: workTypeLabel(key), value: key }));

/**
 * 予定の入力画面が受け取るパラメータ。新しい予定の初期値になる（id があるときは変更で、id の予定を初期値にする）。
 * 農園画面の「確認を明日の予定に追加」は suggested_schedule をこの形で渡す（担当は空のまま）。
 */
type ScheduleInputParams = {
  /** 変える予定の id */
  id?: string;
  /** "YYYY-MM-DD"（日本時間） */
  date?: string;
  /** "HH:MM" か "HH:MM:SS" */
  start?: string;
  end?: string;
  plotId?: string;
  /** 作業の種類をカンマでつないだもの。API の値（「灌水」）でも英語キー（irrigate）でもよい */
  workTypes?: string;
  note?: string;
};

type FormValues = {
  date: string;
  start: string;
  end: string;
  plotId: number | null;
  workTypes: WorkTypeKey[];
  assigneeIds: number[];
  note: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}(:\d{2})?$/;

function parseWorkTypes(value?: string): WorkTypeKey[] {
  if (!value) return [];
  const keys = value.split(',').map((item) => item.trim()).filter(Boolean)
    .map((item) => ((workTypeKeys as string[]).includes(item) ? (item as WorkTypeKey) : fromApiWorkType(item)));
  return [...new Set(keys)];
}

function initialFromParams(params: ScheduleInputParams): FormValues {
  const plotId = Number(params.plotId);
  return {
    date: params.date && datePattern.test(params.date) ? params.date : todayJst(),
    start: params.start && timePattern.test(params.start) ? params.start.slice(0, 5) : '08:00',
    end: params.end && timePattern.test(params.end) ? params.end.slice(0, 5) : '17:00',
    plotId: Number.isInteger(plotId) && plotId > 0 ? plotId : null,
    workTypes: parseWorkTypes(params.workTypes),
    assigneeIds: [],
    note: params.note ?? '',
  };
}

function initialFromSchedule(schedule: Schedule): FormValues {
  return {
    date: schedule.date,
    start: fromApiTime(schedule.start_time) ?? '08:00',
    end: fromApiTime(schedule.end_time) ?? '17:00',
    plotId: schedule.plot_id,
    workTypes: [...new Set(schedule.work_types.map(fromApiWorkType))],
    assigneeIds: schedule.assignees.map((assignee) => assignee.id),
    note: schedule.note ?? '',
  };
}

function goBack(date: string) {
  if (router.canGoBack()) router.back();
  else router.replace({ pathname: '/(tabs)/schedule', params: { date } });
}

export default function NewScheduleScreen() {
  const params = useLocalSearchParams<ScheduleInputParams>();
  const role = useCurrentUser()?.role ?? 'worker';
  const editingId = params.id ? Number(params.id) : null;
  const lookupDate = params.date && datePattern.test(params.date) ? params.date : todayJst();
  const existingQuery = useSchedules(lookupDate, lookupDate, { enabled: editingId !== null });
  const existing = editingId !== null ? existingQuery.data?.find((schedule) => schedule.id === editingId) : undefined;

  const footer = <BottomNav role={role} activeTab="schedule" onTabPress={(tab) => router.navigate(routes[tab])} />;
  const header = <ScreenHeader title={editingId !== null ? '予定を変更' : '予定を入力'} showBack onBack={() => router.back()} />;

  if (editingId !== null && !existing) {
    const message = existingQuery.isError
      ? errorMessage(existingQuery.error)
      : existingQuery.isFetching || !existingQuery.data ? '読み込んでいます' : '予定が見つかりません';
    return (
      <PageLayout background={<HeaderBackground />} header={header} footer={footer} testID="schedule-input-screen">
        <AppText variant="bodyLg">{message}</AppText>
      </PageLayout>
    );
  }

  return (
    <PageLayout background={<HeaderBackground />} header={header} footer={footer} testID="schedule-input-screen">
      <ScheduleForm
        key={existing ? `edit-${existing.id}` : 'new'}
        scheduleId={existing?.id ?? null}
        initial={existing ? initialFromSchedule(existing) : initialFromParams(params)}
        existingAssignees={existing?.assignees ?? []}
      />
    </PageLayout>
  );
}

function ScheduleForm({ scheduleId, initial, existingAssignees }: { scheduleId: number | null; initial: FormValues; existingAssignees: readonly { id: number; name: string }[] }) {
  const queryClient = useQueryClient();
  const plotsQuery = usePlots();
  const candidatesQuery = useAssigneeCandidates();
  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();
  // 送り直しても二重に登録しないよう、この画面のあいだは同じ ID を使う
  const clientEventId = useRef(uuidV4());

  const [values, setValues] = useState(initial);
  const [pickingDate, setPickingDate] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saving = createMutation.isPending || updateMutation.isPending;

  const plots = plotsQuery.data ?? [];
  // 農地が1つだけなら選んでおく
  const plotId = values.plotId ?? (plots.length === 1 ? plots[0].id : null);
  const plotOptions = plots.map((plot) => ({ label: plot.name, value: String(plot.id) }));
  // 停止した作業者は候補に出ないが、すでに担当の人は残せるので選択肢に足す
  const candidates = candidatesQuery.data ?? [];
  const memberOptions = [
    ...candidates.map((candidate) => ({ label: candidate.name, value: String(candidate.id) })),
    ...existingAssignees.filter((assignee) => !candidates.some((candidate) => candidate.id === assignee.id)).map((assignee) => ({ label: assignee.name, value: String(assignee.id) })),
  ];
  const offline = isOfflineError(plotsQuery.error) || isOfflineError(candidatesQuery.error);
  const loadError = plotsQuery.error ?? candidatesQuery.error;

  const parsedDate = new Date(`${values.date}T12:00:00`);
  const update = (next: Partial<FormValues>) => setValues((current) => ({ ...current, ...next }));

  const handleError = (cause: unknown) => {
    if (isApiError(cause, 'invalid_time_range')) {
      setTimeError(cause.message);
      return;
    }
    if (isApiError(cause, 'inactive_assignee')) {
      // 停止した人を外し、候補を取り直す
      const inactive = (cause.detail?.user_ids as number[] | undefined) ?? [];
      setValues((current) => ({ ...current, assigneeIds: current.assigneeIds.filter((id) => !inactive.includes(id)) }));
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.assigneeCandidates() });
    } else if (isApiError(cause, 'user_not_found')) {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.assigneeCandidates() });
    } else if (isApiError(cause, 'plot_not_found')) {
      update({ plotId: null });
      void queryClient.invalidateQueries({ queryKey: plotKeys.all });
    } else if (isApiError(cause, 'not_your_schedule') || isApiError(cause, 'schedule_not_found')) {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    }
    setError(errorMessage(cause));
  };

  const save = () => {
    setError(null);
    setTimeError(null);
    if (offline) {
      setError(offlineMessage);
      return;
    }
    if (plotId === null) {
      setError('農園を選んでください');
      return;
    }
    if (!values.workTypes.length) {
      setError('作業を選んでください');
      return;
    }
    if (values.end <= values.start) {
      setTimeError('終了時刻は開始時刻より後にしてください');
      return;
    }
    const body = {
      plot_id: plotId,
      date: values.date,
      start_time: toApiTime(values.start),
      end_time: toApiTime(values.end),
      work_types: values.workTypes.map(toApiWorkType),
      assignee_ids: values.assigneeIds,
      note: values.note.trim() || null,
    };
    const onSuccess = () => goBack(values.date);
    if (scheduleId !== null) updateMutation.mutate({ id: scheduleId, body }, { onSuccess, onError: handleError });
    else createMutation.mutate({ ...body, client_event_id: clientEventId.current }, { onSuccess, onError: handleError });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`日付 ${parsedDate.getMonth() + 1}月${parsedDate.getDate()}日。押すと日付を変えられます`}
        onPress={() => setPickingDate(true)}
        style={({ pressed }) => [styles.dateRow, pressed && styles.pressed]}
        testID="schedule-date">
        <AppText variant="bodyLgBold">{parsedDate.getMonth() + 1}月{parsedDate.getDate()}日（{weekdays[parsedDate.getDay()]}）</AppText>
        <AppText variant="caption" style={styles.dateChange}>日付を変える</AppText>
      </Pressable>
      {pickingDate ? (
        <ExpoDateTimePicker
          accentColor={colors.primary}
          display="default"
          mode="date"
          onDismiss={() => setPickingDate(false)}
          onValueChange={(_, selected) => {
            const pad = (value: number) => String(value).padStart(2, '0');
            update({ date: `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}` });
            setPickingDate(false);
          }}
          presentation="dialog"
          themeVariant="light"
          value={parsedDate}
        />
      ) : null}
      <TextField
        type="time-range"
        label="時間"
        from={values.start}
        to={values.end}
        onChangeFrom={(start) => { setTimeError(null); update({ start }); }}
        onChangeTo={(end) => { setTimeError(null); update({ end }); }}
        error={timeError ?? undefined}
        testID="schedule-time"
      />
      <Dropdown label="農園" options={plotOptions} value={plotId !== null ? [String(plotId)] : []} onChange={(next) => update({ plotId: Number(next[0]) })} testID="schedule-plot" />
      <Dropdown label="作業（複数選択可）" options={workOptions} value={values.workTypes} multiple onChange={(next) => update({ workTypes: workTypeKeys.filter((key) => next.includes(key)) })} testID="schedule-work" />
      <Dropdown label="担当（複数選択可）" options={memberOptions} value={values.assigneeIds.map(String)} multiple onChange={(next) => update({ assigneeIds: next.map(Number) })} testID="schedule-member" />
      <View style={styles.fieldGroup}>
        <AppText variant="bodyLg">備考</AppText>
        <TextInput accessibilityLabel="備考" maxFontSizeMultiplier={1.2} onChangeText={(note) => update({ note })} style={styles.textField} value={values.note} testID="schedule-note" />
      </View>
      <Toast visible={error !== null || (loadError !== null && !saving)} kind="error" message={error ?? (offline ? offlineMessage : errorMessage(loadError))} testID="schedule-input-error" />
      <Button label="内容を保存する" size="lg" onPress={save} loading={saving} testID="schedule-save" />
    </>
  );
}

const styles = StyleSheet.create({
  dateRow: { alignItems: 'baseline', flexDirection: 'row', gap: 12 },
  dateChange: { color: colors.link, textDecorationLine: 'underline' },
  pressed: { opacity: 0.7 },
  fieldGroup: { gap: 8 },
  textField: { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: 4, color: colors.text, fontFamily: fonts.medium, fontSize: 23, height: 58, lineHeight: 25, paddingHorizontal: 20, paddingVertical: 0 },
});
