// 農園日誌の備考の下書き。送る前に端末へ残し、送れたら消す。送れなかったものは次に日誌を開いたときに送り直す。
import AsyncStorage from '@react-native-async-storage/async-storage';

/** 日付（"YYYY-MM-DD"）→ まだ送れていない備考 */
export type JournalDrafts = Record<string, string>;

const DRAFTS_KEY = 'pammit.journal-drafts.v1';

export async function loadJournalDrafts(): Promise<JournalDrafts> {
  try {
    const stored = await AsyncStorage.getItem(DRAFTS_KEY);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch {
    return {};
  }
}

export async function saveJournalDraft(date: string, note: string): Promise<void> {
  try {
    const drafts = await loadJournalDrafts();
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify({ ...drafts, [date]: note }));
  } catch {
    // 残せなくても送信は続ける
  }
}

/** 送れた下書きを消す。送っているあいだに書き足されていたら（中身が違えば）残す */
export async function clearJournalDraft(date: string, sentNote: string): Promise<void> {
  try {
    const drafts = await loadJournalDrafts();
    if (drafts[date] !== sentNote) return;
    const { [date]: _sent, ...rest } = drafts;
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(rest));
  } catch {
    // 消せなくても、次に開いたとき同じ中身をもう一度送るだけ
  }
}
