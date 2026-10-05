import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';

import { errorMessage, isOfflineError, journalNoteMaxLength, useJournalDay, useSaveJournalNote, type JournalDay, type JournalWork } from '@/api';
import { AdminErrorBanner, AdminHeader, AdminPage, AdminTextField, adminTextStyles } from '@/components/admin/figma-admin-ui';
import { todayJst } from '@/lib/datetime';
import { loadJournalDrafts } from '@/storage';
import { colors, radii } from '@/theme/tokens';

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
/** 入力が止まってから保存するまで */
const SAVE_DELAY_MS = 1000;
/** 送れなかったときに送り直すまで */
const RETRY_DELAY_MS = 10_000;

function titleOf(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${month}/${day}（${weekdays[weekday]}）`;
}

/** 気温は整数に丸める。値がなければ空欄 */
const temperature = (value: number | null | undefined) => (value == null ? '' : `${Math.round(value)}℃`);

/** 天気・気温・作業のどれもない日は、自動の記録がまだない */
const hasAutoRecord = (day: JournalDay) => day.weather != null || day.temp_max != null || day.temp_min != null || day.works.length > 0;

type WorkGroup = { key: string; start: string; end: string; workType: string; plotName: string; people: string[] };

/** API は1人1行。同じ時間・作業・場所の行は1枚のカードにまとめ、担当を並べる */
function groupWorks(works: readonly JournalWork[]): WorkGroup[] {
  const groups = new Map<string, WorkGroup>();
  for (const work of works) {
    const key = [work.start, work.end, work.work_type, work.plot_name].join('|');
    const group = groups.get(key);
    if (group) {
      if (!group.people.includes(work.user_name)) group.people.push(work.user_name);
    } else {
      groups.set(key, { key, start: work.start, end: work.end, workType: work.work_type, plotName: work.plot_name, people: [work.user_name] });
    }
  }
  return [...groups.values()];
}

export default function JournalDayScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayJst();
  const journal = useJournalDay(date);
  const saveNote = useSaveJournalNote();
  const { mutate: sendNote } = saveNote;
  const day = journal.data ?? null;

  // null はまだ読み込んでいない
  const [note, setNote] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingOffline, setPendingOffline] = useState(false);
  const noteRef = useRef<string | null>(null);
  const lastSentRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 最新の saveNow。タイマーやキーボードのイベントから呼ぶ */
  const saveNowRef = useRef<() => void>(() => undefined);

  const clearTimer = (timer: { current: ReturnType<typeof setTimeout> | null }) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  /** 今の備考を保存する。前に送ったものと同じなら何もしない */
  const saveNow = useCallback(() => {
    clearTimer(saveTimer);
    const text = noteRef.current;
    if (text === null || text === lastSentRef.current) return;
    lastSentRef.current = text;
    clearTimer(retryTimer);
    sendNote({ date, note: text }, {
      onSuccess: () => {
        setSaveError(null);
        setPendingOffline(false);
        if (noteRef.current !== text) return;
        setSaved(true);
        clearTimer(savedTimer);
        savedTimer.current = setTimeout(() => setSaved(false), 2000);
      },
      onError: (error) => {
        // 下書きは端末に残っている。少し待って送り直し、画面を離れても次に日誌を開いたときに送る
        if (lastSentRef.current === text) lastSentRef.current = null;
        if (isOfflineError(error)) {
          setPendingOffline(true);
          clearTimer(retryTimer);
          retryTimer.current = setTimeout(() => saveNowRef.current(), RETRY_DELAY_MS);
        } else {
          setSaveError(errorMessage(error));
        }
      },
    });
  }, [date, sendNote]);
  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);

  // サーバーの備考で始める。端末に送れていない下書きがあればそちらを出し、送り直す
  const loaded = journal.isSuccess || journal.isError;
  const serverNote = day?.note ?? '';
  useEffect(() => {
    if (!loaded || noteRef.current !== null) return;
    let cancelled = false;
    void loadJournalDrafts().then((drafts) => {
      if (cancelled || noteRef.current !== null) return;
      const draft = drafts[date];
      lastSentRef.current = journal.isSuccess ? serverNote : null;
      noteRef.current = draft ?? serverNote;
      setNote(noteRef.current);
      if (draft !== undefined) saveNowRef.current();
    });
    return () => {
      cancelled = true;
    };
  }, [date, journal.isSuccess, loaded, serverNote]);

  // キーボードを閉じたとき・画面を離れたときに保存する
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => saveNowRef.current());
    return () => {
      subscription.remove();
      saveNowRef.current();
      clearTimer(retryTimer);
      clearTimer(savedTimer);
    };
  }, []);

  const changeNote = (value: string) => {
    noteRef.current = value;
    setNote(value);
    setSaved(false);
    clearTimer(saveTimer);
    saveTimer.current = setTimeout(() => saveNowRef.current(), SAVE_DELAY_MS);
  };

  const works = day ? groupWorks(day.works) : [];
  const loadError = journal.isError ? errorMessage(journal.error) : null;
  const status = saved ? '保存しました' : pendingOffline ? '端末に残しました。通信が戻ったら送ります' : null;

  return (
    <AdminPage
      bottomNav
      header={<>
        <AdminErrorBanner message={saveError ?? loadError} actionLabel={!saveError && loadError ? '再読み込み' : undefined} onAction={() => void journal.refetch()} testID="journal-day-error" />
        <AdminHeader showBack title={titleOf(date)} onBack={() => router.back()} />
      </>}
      contentStyle={styles.content}
      testID="journal-day-screen">
      {day && hasAutoRecord(day) ? <><View style={styles.summary}>
        <Metric label="天気" value={day.weather ?? '-'} note={day.weather ? '朝の予報' : '　'} />
        <Metric label="気温" value={temperature(day.temp_max) || '　'} note={day.temp_min == null ? '　' : `最低 ${temperature(day.temp_min)}`} />
        <Metric label="作業人数" value={`${day.worker_count}人`} note="　" />
      </View>
      <View style={styles.works}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>作業</Text>
        {works.length ? works.map((work) => (
          <ScheduleCard key={work.key} start={work.start} end={work.end} work={work.workType} place={work.plotName} people={work.people.join('・')} />
        )) : <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.caption}>この日の作業の記録はありません</Text>}
      </View></> : journal.isSuccess ? <Text maxFontSizeMultiplier={1.2} style={styles.emptyMessage}>この日の日誌はまだありません</Text> : null}
      <View style={styles.noteField}>
        <AdminTextField
          label="備考"
          value={note ?? ''}
          onChangeText={changeNote}
          inputProps={{ maxLength: journalNoteMaxLength, onBlur: () => saveNowRef.current() }}
        />
        {status ? <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2} style={styles.status}>{status}</Text> : null}
      </View>
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
    <View style={styles.scheduleCard}>
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
    </View>
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
  emptyMessage: { ...adminTextStyles.bodyLg, alignSelf: 'center', color: colors.textSub, marginVertical: 36 },
  noteField: { alignSelf: 'stretch', gap: 6 },
  status: { ...adminTextStyles.caption, color: colors.primary },
});
