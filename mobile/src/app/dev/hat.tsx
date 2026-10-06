import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Card, SmallButton, TextField } from '@/components/ui';
import { hatController, type HatConnection, type HatSnapshot, type TalkPhase } from '@/hat';
import { runSelfCheck, type CheckStep } from '@/hat/self-check';
import { nativeAvailability } from '@/native';
import { loadSettings, saveSettings } from '@/storage/settings';
import { colors } from '@/theme/tokens';

const connectionLabels: Record<HatConnection, string> = {
  disconnected: '未接続',
  connecting: '接続中',
  connected: '接続済み',
};

const talkLabels: Record<TalkPhase, string> = {
  off: '—',
  listening: '聞いています',
  thinking: '考えています',
  speaking: '答えています',
};

// 帽子（Pi）と通しで試す画面。IP を入れてつなぐと、判定と相談を帽子の合図で動かせる。
export default function HatDevScreen() {
  const [ip, setIp] = useState('');
  const [snapshot, setSnapshot] = useState<HatSnapshot | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [steps, setSteps] = useState<CheckStep[]>([]);

  useEffect(() => {
    void loadSettings().then((settings) => setIp(settings.hatIp));
    return hatController.subscribe(setSnapshot);
  }, []);

  if (!__DEV__) return <Redirect href="/" />;

  const connect = async () => {
    setStarting(true);
    setError(null);
    try {
      await saveSettings({ hatIp: ip.trim() });
      await hatController.start(ip);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  };

  const selfCheck = async () => {
    setChecking(true);
    setSteps([]);
    await runSelfCheck((s) => setSteps((current) => [...current, s]));
    setChecking(false);
  };

  const answer = snapshot?.lastAnswer;
  return (
    <PageLayout testID="dev-hat">
      <ScreenHeader title="帽子と通しで試す" />
      {!nativeAvailability.fruitDetector && (
        <AppText style={styles.warning}>判定のネイティブ部品がないため、仮の答えで動きます</AppText>
      )}
      <TextField
        label="帽子の IP"
        value={ip}
        onChangeText={setIp}
        placeholder="192.168.x.x"
        inputProps={{ keyboardType: 'numbers-and-punctuation', autoCapitalize: 'none', autoCorrect: false }}
      />
      <View style={styles.row}>
        <SmallButton label={starting ? '準備中…' : 'つなぐ'} onPress={connect} disabled={starting || !ip.trim()} />
        <SmallButton label="切る" variant="secondary" onPress={() => hatController.stop()} />
      </View>
      {error && <AppText style={styles.warning}>{error}</AppText>}
      <SmallButton label={checking ? '確かめています…' : '帽子なしで確かめる'} variant="secondary" onPress={selfCheck} disabled={checking} />
      {steps.length > 0 && (
        <Card>
          {steps.map((s) => (
            <AppText key={s.name} variant="caption" style={s.ok ? undefined : styles.warning}>
              {s.ok ? '○' : '×'} {s.name}（{s.ms} ms）：{s.detail}
            </AppText>
          ))}
        </Card>
      )}
      <Card>
        <AppText>接続：{snapshot ? connectionLabels[snapshot.connection] : '—'}</AppText>
        <AppText>相談：{snapshot ? talkLabels[snapshot.talk] : '—'}</AppText>
        <AppText>最後の答え：{answer ? `${answer.say}（${answer.scene}）` : '—'}</AppText>
        {answer && (
          <AppText variant="caption">
            判定 {answer.timingMs.total ?? '?'} ms／合図から送信まで {snapshot?.lastJudgeMs ?? '?'} ms／実 {answer.fruits}個（陰 {answer.shadedFruits}）
          </AppText>
        )}
        <AppText>最後の相談：{snapshot?.lastTranscript ?? '—'}</AppText>
      </Card>
      <Card>
        {(snapshot?.logs ?? []).map((line, i) => (
          <AppText key={i} variant="caption">
            {line}
          </AppText>
        ))}
      </Card>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  warning: { color: colors.cta },
});
