// 端末に残した作業の終了と「今日の気づき」を送る。残し方は src/storage/work-outbox.ts。
// 送るのはログイン中の人の分だけ。別の人が残した分は、その人がログインするまで残す。
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import {
  loadWorkOutbox,
  removePendingFinish,
  removePendingVoiceNote,
  type PendingFinish,
  type WorkOutbox,
} from '@/storage';

import { isApiError } from './errors';
import { fetchMyActiveWorkSessions, finishWorkSession, postVoiceNote, workSessionKeys } from './work-sessions';
import type { WorkSession } from './types';

export const workOutboxKeys = {
  all: ['work-outbox'] as const,
  mine: (userId: number | undefined) => [...workOutboxKeys.all, userId ?? 'none'] as const,
};

/** 送り直しても同じ結果になるエラー（作業がない・ほかの人の作業・音声でないなど）。端末には残さない */
export function isRejectedByServer(error: unknown) {
  return isApiError(error) && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 408 && error.status !== 429;
}

function mine(outbox: WorkOutbox, userId: number): WorkOutbox {
  return {
    finishes: outbox.finishes.filter((finish) => finish.userId === userId),
    voiceNotes: outbox.voiceNotes.filter((note) => note.userId === userId),
  };
}

let flushing: { userId: number; promise: Promise<WorkOutbox> } | null = null;

/**
 * 残っている自分の分を送り、まだ残っているものを返す。通信が切れていれば何も消さずに返す。
 * 終了を先に送る（気づきは終えた作業に付けるため）。
 */
export function flushWorkOutbox(userId: number): Promise<WorkOutbox> {
  if (flushing?.userId === userId) return flushing.promise;
  const promise = (async () => {
    const outbox = mine(await loadWorkOutbox(), userId);
    for (const finish of outbox.finishes) {
      try {
        await finishWorkSession(finish.sessionId, finish.endedAt);
        await removePendingFinish(finish.sessionId);
      } catch (error) {
        if (isRejectedByServer(error)) await removePendingFinish(finish.sessionId);
        else break;
      }
    }
    for (const note of outbox.voiceNotes) {
      try {
        await postVoiceNote(note.sessionId, note);
        await removePendingVoiceNote(note.clientEventId);
      } catch (error) {
        if (isRejectedByServer(error)) await removePendingVoiceNote(note.clientEventId);
        else break;
      }
    }
    return mine(await loadWorkOutbox(), userId);
  })().finally(() => {
    if (flushing?.promise === promise) flushing = null;
  });
  flushing = { userId, promise };
  return promise;
}

/**
 * ログインした直後と起動時に呼ぶ。残っている終了を送ってから、終わっていない自分の作業を探す。
 * 終了を送れていない作業は「同期待ち」なので、作業中の画面には戻さない。通信が切れていれば null。
 */
export async function findResumableWorkSession(userId: number): Promise<WorkSession | null> {
  try {
    const pending = await flushWorkOutbox(userId);
    const sessions = await fetchMyActiveWorkSessions();
    return sessions.find((session) => !pending.finishes.some((finish) => finish.sessionId === session.id)) ?? null;
  } catch {
    return null;
  }
}

/**
 * 自分の送り待ち。画面にいるあいだ、残っていれば30秒ごとと、アプリに戻ったときに送り直す。
 * 終了の送り待ちがあるあいだは新しい作業を始めない。
 */
export function useWorkOutbox(userId: number | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: workOutboxKeys.mine(userId),
    queryFn: () => flushWorkOutbox(userId as number),
    enabled: userId !== undefined,
    staleTime: 0,
    retry: false,
    refetchInterval: (current) => {
      const data = current.state.data;
      return data && (data.finishes.length > 0 || data.voiceNotes.length > 0) ? 30_000 : false;
    },
  });
  const { refetch } = query;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && userId !== undefined) void refetch();
    });
    return () => subscription.remove();
  }, [refetch, userId]);

  // 送れたら作業の一覧を取り直す
  const finishes = query.data?.finishes;
  useEffect(() => {
    if (finishes) void queryClient.invalidateQueries({ queryKey: workSessionKeys.myActive() });
  }, [finishes, queryClient]);

  const pendingFinishes: PendingFinish[] = finishes ?? [];
  const isSyncPending = (sessionId: number) => pendingFinishes.some((finish) => finish.sessionId === sessionId);

  return {
    /** 終了の送り待ちがあるか（あれば新しい作業を始めない） */
    hasPendingFinish: pendingFinishes.length > 0,
    pendingVoiceNotes: query.data?.voiceNotes.length ?? 0,
    isSyncPending,
    /** 端末に残したあとなどに、すぐ送り直す */
    refresh: refetch,
    loading: query.isPending && userId !== undefined,
  };
}
