// 農園日誌の API（owner）。日付はすべて日本時間の "YYYY-MM-DD"。
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { clearJournalDraft, loadJournalDrafts, saveJournalDraft } from '@/storage';

import { apiRequest } from './client';
import type { JournalDay, JournalExport } from './types';

/** 備考の最大文字数（サーバーと同じ） */
export const journalNoteMaxLength = 2000;

// ---- キー ----

export const journalKeys = {
  all: ['journals'] as const,
  range: (from: string, to: string) => [...journalKeys.all, 'range', from, to] as const,
};

// ---- 関数 ----

/** 1年以内。作業のない日も1日1件返る */
export function fetchJournals(from: string, to: string, signal?: AbortSignal) {
  return apiRequest<JournalDay[]>('/journals', { query: { from, to }, signal });
}

/** 備考を保存する。空にすると消える */
export function putJournalNote(date: string, note: string) {
  return apiRequest<JournalDay>(`/journals/${date}/note`, { method: 'PUT', body: { note } });
}

/** PDF を作り、10分間だけ開ける URL を返す */
export function exportJournals(from: string, to: string) {
  return apiRequest<JournalExport>('/journals/export', { method: 'POST', query: { from, to }, timeoutMs: 60_000 });
}

/** 先に端末へ下書きを残してから送る。送れたら下書きを消す */
async function sendNote(date: string, note: string) {
  await saveJournalDraft(date, note);
  const day = await putJournalNote(date, note);
  await clearJournalDraft(date, note);
  return day;
}

/** 読み込み済みの日誌の、その日の分だけを書き換える */
function replaceCachedDay(queryClient: QueryClient, day: JournalDay) {
  queryClient.setQueriesData<JournalDay[]>({ queryKey: journalKeys.all }, (days) =>
    days?.map((item) => (item.date === day.date ? day : item)),
  );
}

// ---- フック ----

/** 期間の日誌（カレンダーは1か月ずつ） */
export function useJournals(from: string, to: string) {
  return useQuery({
    queryKey: journalKeys.range(from, to),
    queryFn: ({ signal }) => fetchJournals(from, to, signal),
  });
}

/** 1日分の日誌 */
export function useJournalDay(date: string) {
  return useQuery({
    queryKey: journalKeys.range(date, date),
    queryFn: ({ signal }) => fetchJournals(date, date, signal),
    select: (days) => days[0] ?? null,
  });
}

/** 備考を保存する。送れなかったときは下書きが端末に残り、useFlushJournalDrafts で送り直す */
export function useSaveJournalNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, note }: { date: string; note: string }) => sendNote(date, note),
    onSuccess: (day) => replaceCachedDay(queryClient, day),
  });
}

/** 端末に残っている、まだ送れていない備考をまとめて送る。送れたものは日付の一覧で返す */
export function useFlushJournalDrafts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const drafts = await loadJournalDrafts();
      const sent: string[] = [];
      for (const [date, note] of Object.entries(drafts)) {
        try {
          replaceCachedDay(queryClient, await sendNote(date, note));
          sent.push(date);
        } catch {
          // 残したまま、次に開いたときに送り直す
        }
      }
      return sent;
    },
  });
}

/** PDF の URL を作る */
export function useExportJournals() {
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => exportJournals(from, to),
  });
}
