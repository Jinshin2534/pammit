import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { errorMessage, isApiError, useStartWorkSession, useWorkOutbox, workSessionKeys } from '@/api';
import { Dialog } from '@/components/feedback';
import { Button } from '@/components/ui';
import { WorkDisplayField, WorkFlowFooter, WorkPage, WorkStepHeader, workTextStyles } from '@/components/work/figma-work-ui';
import { flowParams, parseId, parseWorkTypeKey, type WorkFlowParams } from '@/components/work/work-flow-params';
import { openActiveWork } from '@/components/work/work-navigation';
import { nowIso } from '@/lib/datetime';
import { uuidV4 } from '@/lib/uuid';
import { toApiWorkType, workTypeLabel } from '@/lib/work-types';
import { useCurrentUser } from '@/providers/auth';
import { colors } from '@/theme/tokens';

type Problem =
  /** 判定の設定がない。帽子なしで始め直すか、別の作業を選ぶ */
  | 'judgment_config_missing'
  /** 予定が変わった・担当でなくなった。予定を選び直す */
  | 'schedule_changed'
  /** 農地が削除された。農地を選び直す */
  | 'plot_not_found';

export default function WorkConfirmScreen() {
  const params = useLocalSearchParams<WorkFlowParams>();
  const queryClient = useQueryClient();
  const me = useCurrentUser();
  const outbox = useWorkOutbox(me?.id);
  const start = useStartWorkSession();
  // 送り直しても作業が1つになるよう、この画面で1つ作って使い回す
  const [clientEventId] = useState(uuidV4);
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);

  const plotId = parseId(params.plotId);
  const scheduleId = parseId(params.scheduleId);
  const work = parseWorkTypeKey(params.work);
  const usesHat = params.usesHat !== '0';
  const memberName = me ? `${me.name.split(/[\s　]+/)[0] || me.name}（ログイン中）` : '';

  const submit = (withHat: boolean) => {
    if (plotId === null || !work || start.isPending) return;
    if (outbox.hasPendingFinish) {
      setMessage('同期待ちの作業があります。送り終わるまで新しい作業は始められません');
      return;
    }
    setMessage(null);
    start.mutate(
      {
        client_event_id: clientEventId,
        plot_id: plotId,
        work_type: toApiWorkType(work),
        schedule_id: scheduleId,
        uses_hat: withHat,
        started_at: nowIso(),
      },
      {
        onSuccess: (session) => openActiveWork(session.id),
        onError: (error) => {
          if (isApiError(error, 'session_already_active')) {
            const activeId = Number(error.detail?.session_id);
            if (Number.isInteger(activeId)) openActiveWork(activeId, { resumed: true });
            return;
          }
          if (isApiError(error, 'judgment_config_missing')) {
            setProblem('judgment_config_missing');
            return;
          }
          if (
            isApiError(error, 'not_schedule_assignee') ||
            isApiError(error, 'schedule_plot_mismatch') ||
            isApiError(error, 'work_type_not_in_schedule') ||
            isApiError(error, 'schedule_not_found')
          ) {
            setProblem('schedule_changed');
            return;
          }
          if (isApiError(error, 'plot_not_found')) {
            setProblem('plot_not_found');
            return;
          }
          // 通信が切れているときは「この機能には通信が必要です」
          setMessage(errorMessage(error));
        },
      },
    );
  };

  /** 作業を選ぶ画面まで戻る */
  const chooseAnotherWork = () => {
    setProblem(null);
    router.dismissTo({ pathname: '/work/type', params: flowParams({ ...params, work: undefined }) });
  };

  /** 予定を取り直して、作業を始める画面から選び直す */
  const chooseScheduleAgain = () => {
    setProblem(null);
    void queryClient.invalidateQueries({ queryKey: workSessionKeys.all });
    router.dismissAll();
  };

  /** 農地の一覧を取り直して、農地を選ぶ画面に戻る */
  const choosePlotAgain = () => {
    setProblem(null);
    void queryClient.invalidateQueries({ queryKey: workSessionKeys.plots() });
    if (scheduleId !== null) router.dismissAll();
    else router.dismissTo({ pathname: '/work/plot', params: flowParams({ ...params, plotId: undefined, plotName: undefined }) });
  };

  return (
    <WorkPage
      header={<WorkStepHeader current={4} title="作業開始の確認" />}
      footer={<WorkFlowFooter nextLabel="作業開始" nextVariant="cta" onBack={() => router.back()} onNext={() => submit(usesHat)} nextDisabled={plotId === null || !work || start.isPending} />}
      testID="work-confirm-screen">
      <WorkDisplayField label="農園" value={params.plotName ?? ''} />
      <WorkDisplayField label="作業" value={work ? workTypeLabel(work) : ''} />
      <WorkDisplayField label="担当" value={memberName} />
      {message ? <Text accessibilityRole="alert" maxFontSizeMultiplier={1.2} style={styles.message}>{message}</Text> : null}

      <Dialog
        visible={problem === 'judgment_config_missing'}
        title="帽子を使った判定ができません"
        body="判定の設定を読み込めませんでした。帽子なしで始めるか、別の作業を選んでください"
        confirmLabel="帽子なしで始める"
        cancelLabel="戻る"
        onConfirm={() => {
          setProblem(null);
          submit(false);
        }}
        onCancel={() => setProblem(null)}>
        <Button label="別の作業を選ぶ" variant="primary" onPress={chooseAnotherWork} />
      </Dialog>
      <Dialog
        visible={problem === 'schedule_changed'}
        title="この予定からは始められません"
        body="予定が変わったか、担当ではなくなりました。予定を選び直してください"
        confirmLabel="予定を選び直す"
        cancelLabel="戻る"
        onConfirm={chooseScheduleAgain}
        onCancel={() => setProblem(null)}
      />
      <Dialog
        visible={problem === 'plot_not_found'}
        title="農園が見つかりません"
        body="農園が削除されたかもしれません。選び直してください"
        confirmLabel="選び直す"
        cancelLabel="戻る"
        onConfirm={choosePlotAgain}
        onCancel={() => setProblem(null)}
      />
    </WorkPage>
  );
}

const styles = StyleSheet.create({
  message: { ...workTextStyles.body, alignSelf: 'stretch', color: colors.cta, textAlign: 'center' },
});
