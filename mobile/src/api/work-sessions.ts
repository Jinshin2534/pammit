// 作業の API。作業画面をつなぐときに、ここへ関数とフックを足す。
import { apiRequest } from './client';
import type { WorkSession } from './types';

export const workSessionKeys = {
  all: ['work-sessions'] as const,
  myActive: () => [...workSessionKeys.all, 'mine', 'active'] as const,
};

/** 終わっていない自分の作業。ログインした直後に呼び、あれば作業中の画面へ戻す */
export function fetchMyActiveWorkSessions(signal?: AbortSignal) {
  return apiRequest<WorkSession[]>('/work-sessions', { query: { mine: true, active: true }, signal });
}
