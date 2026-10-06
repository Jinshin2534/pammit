// 通信が切れていて送れなかった作業の終了と「今日の気づき」。つながったら src/api/work-outbox.ts が送る。
// 再起動しても消えないよう AsyncStorage に置く。ログアウトしても消さず、userId が同じ人のときだけ送る。
import AsyncStorage from '@react-native-async-storage/async-storage';

/** 終えた時刻だけ端末に残した作業 */
export type PendingFinish = {
  userId: number;
  sessionId: number;
  /** 端末で終えた時刻（ISO 8601） */
  endedAt: string;
};

/** 送れなかった「今日の気づき」 */
export type PendingVoiceNote = {
  userId: number;
  sessionId: number;
  /** 送り直しても1件になるよう、録音したときに作った ID をそのまま使う */
  clientEventId: string;
  /** 端末にある音声ファイル */
  audio: { uri: string; name: string; mimeType: string };
  transcript: string;
  recordedAt: string;
};

export type WorkOutbox = {
  finishes: PendingFinish[];
  voiceNotes: PendingVoiceNote[];
};

const OUTBOX_KEY = 'pammit.work-outbox.v1';
const emptyOutbox: WorkOutbox = { finishes: [], voiceNotes: [] };

function isPendingFinish(value: unknown): value is PendingFinish {
  const item = value as Partial<PendingFinish> | null;
  return typeof item?.userId === 'number' && typeof item.sessionId === 'number' && typeof item.endedAt === 'string';
}

function isPendingVoiceNote(value: unknown): value is PendingVoiceNote {
  const item = value as Partial<PendingVoiceNote> | null;
  return (
    typeof item?.userId === 'number' &&
    typeof item.sessionId === 'number' &&
    typeof item.clientEventId === 'string' &&
    typeof item.audio?.uri === 'string' &&
    typeof item.transcript === 'string' &&
    typeof item.recordedAt === 'string'
  );
}

export async function loadWorkOutbox(): Promise<WorkOutbox> {
  try {
    const stored = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!stored) return emptyOutbox;
    const parsed = JSON.parse(stored) as Partial<WorkOutbox>;
    return {
      finishes: Array.isArray(parsed.finishes) ? parsed.finishes.filter(isPendingFinish) : [],
      voiceNotes: Array.isArray(parsed.voiceNotes) ? parsed.voiceNotes.filter(isPendingVoiceNote) : [],
    };
  } catch {
    return emptyOutbox;
  }
}

// 読んで書き換えるあいだに別の書き換えが割り込まないよう、1本ずつ順に行う
let queue: Promise<unknown> = Promise.resolve();

function update(change: (outbox: WorkOutbox) => WorkOutbox): Promise<boolean> {
  const next = queue.then(async () => {
    try {
      const current = await loadWorkOutbox();
      await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(change(current)));
      return true;
    } catch {
      return false;
    }
  });
  queue = next;
  return next;
}

/** 終了を残す。同じ作業は最初に終えた時刻のままにする。残せたら true */
export function addPendingFinish(item: PendingFinish): Promise<boolean> {
  return update((outbox) =>
    outbox.finishes.some((finish) => finish.sessionId === item.sessionId)
      ? outbox
      : { ...outbox, finishes: [...outbox.finishes, item] },
  );
}

export function removePendingFinish(sessionId: number): Promise<boolean> {
  return update((outbox) => ({ ...outbox, finishes: outbox.finishes.filter((finish) => finish.sessionId !== sessionId) }));
}

/** 気づきを残す。残せたら true */
export function addPendingVoiceNote(item: PendingVoiceNote): Promise<boolean> {
  return update((outbox) =>
    outbox.voiceNotes.some((note) => note.clientEventId === item.clientEventId)
      ? outbox
      : { ...outbox, voiceNotes: [...outbox.voiceNotes, item] },
  );
}

export function removePendingVoiceNote(clientEventId: string): Promise<boolean> {
  return update((outbox) => ({ ...outbox, voiceNotes: outbox.voiceNotes.filter((note) => note.clientEventId !== clientEventId) }));
}
