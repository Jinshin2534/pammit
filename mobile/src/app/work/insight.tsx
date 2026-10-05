import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage, isApiError, isRejectedByServer, postVoiceNote, useWorkSession, workOutboxKeys, type VoiceNoteUpload } from '@/api';
import { useStatusBarOffset, WorkBackButton, WorkButton, workTextStyles } from '@/components/work/figma-work-ui';
import { RecordedAudio, startVoiceNoteRecording, stopVoiceNoteRecording, transcribeVoiceNote } from '@/components/work/voice-note-recorder';
import { parseId } from '@/components/work/work-flow-params';
import { uuidV4 } from '@/lib/uuid';
import { fromApiWorkType, isHatWorkType } from '@/lib/work-types';
import { useCurrentUser } from '@/providers/auth';
import { addPendingVoiceNote } from '@/storage';
import { colors } from '@/theme/tokens';

type Step =
  | { kind: 'idle' }
  | { kind: 'recording' }
  | { kind: 'transcribing' }
  /** 文字に起こせた。送る前に見せる */
  | { kind: 'ready'; audio: RecordedAudio; transcript: string }
  /** 文字に起こせなかった。「もう一度録音」か「今回はスキップ」 */
  | { kind: 'failed' }
  | { kind: 'sending'; audio: RecordedAudio; transcript: string }
  | { kind: 'done'; message: string };

export default function InsightScreen() {
  const params = useLocalSearchParams<{ sessionId?: string; syncPending?: string }>();
  const sessionId = parseId(params.sessionId) ?? Number.NaN;
  const session = useWorkSession(sessionId);
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const topOffset = useStatusBarOffset();
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  // 送り直しても1件になるよう、録音ごとに1つ作る
  const [clientEventId, setClientEventId] = useState(uuidV4);
  const data = session.data;
  const showCounts = data ? data.uses_hat && isHatWorkType(fromApiWorkType(data.work_type)) : false;
  const goHome = () => router.replace('/(tabs)');

  const startRecording = async () => {
    setError(null);
    try {
      await startVoiceNoteRecording();
      setClientEventId(uuidV4());
      setStep({ kind: 'recording' });
    } catch {
      setError('録音を始められませんでした。マイクの許可を確認してください');
    }
  };

  const stopRecording = async () => {
    setStep({ kind: 'transcribing' });
    let audio: RecordedAudio;
    try {
      audio = await stopVoiceNoteRecording();
    } catch {
      setStep({ kind: 'failed' });
      return;
    }
    try {
      const transcript = (await transcribeVoiceNote(audio)).trim();
      setStep(transcript ? { kind: 'ready', audio, transcript } : { kind: 'failed' });
    } catch {
      setStep({ kind: 'failed' });
    }
  };

  const send = async (audio: RecordedAudio, transcript: string) => {
    if (!me || !Number.isFinite(sessionId)) return;
    const note: VoiceNoteUpload = {
      clientEventId,
      audio: { uri: audio.uri, name: audio.name, mimeType: audio.mimeType },
      transcript,
      recordedAt: audio.recordedAt,
    };
    setError(null);
    setStep({ kind: 'sending', audio, transcript });
    try {
      await postVoiceNote(sessionId, note);
      setStep({ kind: 'done', message: '今日の気づきを残しました' });
    } catch (cause) {
      if (isRejectedByServer(cause)) {
        setError(errorMessage(cause));
        setStep({ kind: 'ready', audio, transcript });
        return;
      }
      // 通信が切れている・ログインが切れたときは端末に残し、あとで送る
      const saved = await addPendingVoiceNote({ userId: me.id, sessionId, ...note });
      void queryClient.invalidateQueries({ queryKey: workOutboxKeys.all });
      if (!saved) {
        setError('端末に残せませんでした。もう一度お試しください');
        setStep({ kind: 'ready', audio, transcript });
        return;
      }
      if (isApiError(cause) && cause.status === 401) return;
      setStep({ kind: 'done', message: '通信がつながったら送ります' });
    }
  };

  const recordButton = (() => {
    switch (step.kind) {
      case 'idle':
        return <WorkButton label="スタート" onPress={() => void startRecording()} />;
      case 'recording':
        return <WorkButton label="ストップ" onPress={() => void stopRecording()} />;
      case 'transcribing':
        return <WorkButton label="文字起こし中" disabled onPress={() => undefined} />;
      case 'ready':
        return <WorkButton label="送る" onPress={() => void send(step.audio, step.transcript)} />;
      case 'sending':
        return <WorkButton label="送信中" disabled onPress={() => undefined} />;
      case 'failed':
        return (
          <>
            <WorkButton label="もう一度録音" onPress={() => void startRecording()} />
            <WorkButton label="今回はスキップ" onPress={goHome} />
          </>
        );
      case 'done':
        return null;
    }
  })();

  const caption =
    step.kind === 'recording' ? '録音しています'
    : step.kind === 'ready' || step.kind === 'sending' ? step.transcript
    : step.kind === 'failed' ? '文字に起こせませんでした'
    : step.kind === 'done' ? step.message
    : null;

  return (
    <View style={styles.page} testID="work-insight-screen">
      <Image source={require('../../../assets/images/work-finish-ellipse.svg')} style={styles.ellipse} contentFit="fill" accessible={false} />
      <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
        <View style={[styles.header, { height: 78 + topOffset, paddingTop: 40 + topOffset }]}>
          <Text maxFontSizeMultiplier={1.2} style={workTextStyles.title}>作業フィニッシュ！</Text>
          {showCounts ? <Text maxFontSizeMultiplier={1.2} style={workTextStyles.body}>切る75 / 残す56 / 判断不可2</Text> : null}
          {params.syncPending === '1' ? <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.syncPending]}>同期待ち</Text> : null}
        </View>
        <View style={styles.content}>
          <View style={styles.messageGroup}>
            <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.bodyLg, styles.center]}>{'お疲れ様でした！\n今日の気づきを残しておこう'}</Text>
            <View style={styles.recorder}>
              <Image source={require('../../../assets/images/mic.png')} style={styles.mic} contentFit="cover" accessible={false} />
              {recordButton}
            </View>
            {caption ? <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2} numberOfLines={4} style={[workTextStyles.body, styles.center]}>{caption}</Text> : null}
            {error ? <Text accessibilityRole="alert" maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center, styles.error]}>{error}</Text> : null}
          </View>
        </View>
        <View style={styles.footer}>
          {/* 作業中の画面は閉じてあるので、戻るとホームになる */}
          <WorkBackButton onPress={() => (router.canGoBack() ? router.back() : goHome())} />
          <WorkButton label="ホームへ戻る" onPress={goHome} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignSelf: 'center', backgroundColor: colors.accent, flex: 1, maxWidth: Platform.OS === 'web' ? 360 : undefined, overflow: 'hidden', width: '100%' },
  ellipse: { height: 516, left: '50%', marginLeft: -264, position: 'absolute', top: 142, width: 530 },
  safeArea: { flex: 1 },
  header: { alignItems: 'center', gap: 19, height: 78, paddingBottom: 8, paddingTop: 40, width: '100%' },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 24, paddingHorizontal: 40, paddingTop: 8 },
  messageGroup: { alignItems: 'center', gap: 44, width: 299 },
  center: { textAlign: 'center' },
  syncPending: { color: colors.cta },
  error: { color: colors.cta },
  recorder: { alignItems: 'center', gap: 24, width: 152 },
  mic: { height: 110, width: 107 },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 32, paddingHorizontal: 40, paddingTop: 12, width: '100%' },
});
