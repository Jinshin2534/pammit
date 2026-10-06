// 作業の API。作業を始める画面で使う予定と農地の読み取りもここに置く（予定・農園の画面とはキーを分けている）。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from './client';
import type { Schemas, WorkSession } from './types';

export type WorkSchedule = Schemas['Schedule'];
export type WorkPlot = Schemas['Plot'];
export type WorkSessionCreate = Schemas['WorkSessionCreate'];
export type SessionChatMessage = Schemas['SessionChatMessage'];
export type VoiceNote = Schemas['VoiceNote'];
export type DetectionIn = Schemas['DetectionIn'];
export type DetectionCounts = Schemas['DetectionCounts'];

/** 「今日の気づき」で送るもの。音声は端末にあるファイル */
export type VoiceNoteUpload = {
  clientEventId: string;
  audio: { uri: string; name: string; mimeType: string };
  transcript: string;
  recordedAt: string;
};

export const workSessionKeys = {
  all: ['work-sessions'] as const,
  myActive: () => [...workSessionKeys.all, 'mine', 'active'] as const,
  detail: (id: number) => [...workSessionKeys.all, 'detail', id] as const,
  chatMessages: (id: number) => [...workSessionKeys.all, 'detail', id, 'chat-messages'] as const,
  schedules: (date: string) => [...workSessionKeys.all, 'start', 'schedules', date] as const,
  plots: () => [...workSessionKeys.all, 'start', 'plots'] as const,
};

// ---- 関数 ----

/** 帽子の判定を送る。同じ client_event_id は保存し直されない */
export function postDetections(sessionId: number, detections: DetectionIn[]) {
  return apiRequest<Schemas['DetectionBatchResult']>(`/work-sessions/${sessionId}/detections`, {
    method: 'POST',
    body: { detections },
  });
}

/** 終わっていない自分の作業。ログインした直後に呼び、あれば作業中の画面へ戻す */
export function fetchMyActiveWorkSessions(signal?: AbortSignal) {
  return apiRequest<WorkSession[]>('/work-sessions', { query: { mine: true, active: true }, signal });
}

export function fetchWorkSession(id: number, signal?: AbortSignal) {
  return apiRequest<WorkSession>(`/work-sessions/${id}`, { signal });
}

/** POST /work-sessions。409 session_already_active などは ApiError で投げる */
export function startWorkSession(body: WorkSessionCreate) {
  return apiRequest<WorkSession>('/work-sessions', { method: 'POST', body });
}

/** 終了済みの作業に送り直しても、最初の終了時刻のまま返る */
export function finishWorkSession(id: number, endedAt: string) {
  return apiRequest<WorkSession>(`/work-sessions/${id}/finish`, { method: 'POST', body: { ended_at: endedAt } });
}

export function fetchSessionChatMessages(id: number, signal?: AbortSignal) {
  return apiRequest<SessionChatMessage[]>(`/work-sessions/${id}/chat-messages`, { signal });
}

/** 「今日の気づき」を multipart/form-data で送る。同じ clientEventId で送り直しても1件になる */
export function postVoiceNote(sessionId: number, note: VoiceNoteUpload) {
  const form = new FormData();
  // React Native の FormData は { uri, name, type } でファイルを送る
  form.append('file', { uri: note.audio.uri, name: note.audio.name, type: note.audio.mimeType } as unknown as Blob);
  form.append('client_event_id', note.clientEventId);
  form.append('transcript', note.transcript);
  form.append('recorded_at', note.recordedAt);
  return apiRequest<VoiceNote>(`/work-sessions/${sessionId}/voice-notes`, { method: 'POST', body: form });
}

/** 作業を始める画面の予定。日付は日本時間の "YYYY-MM-DD" */
export function fetchWorkSchedules(date: string, signal?: AbortSignal) {
  return apiRequest<WorkSchedule[]>('/schedules', { query: { from: date, to: date }, signal });
}

export function fetchWorkPlots(signal?: AbortSignal) {
  return apiRequest<WorkPlot[]>('/plots', { signal });
}

// ---- フック ----

/**
 * 今日の予定のうち、自分が始められるもの（自分が担当か、担当者のない予定）。時間順。
 */
export function useStartableSchedules(date: string, userId: number | undefined) {
  return useQuery({
    queryKey: workSessionKeys.schedules(date),
    queryFn: ({ signal }) => fetchWorkSchedules(date, signal),
    enabled: userId !== undefined,
    staleTime: 0,
    select: (schedules) =>
      schedules
        .filter((schedule) => schedule.assignees.length === 0 || schedule.assignees.some((assignee) => assignee.id === userId))
        .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
  });
}

/** 作業を始められる農地（削除した農地はサーバーが返さない） */
export function useWorkPlots() {
  return useQuery({
    queryKey: workSessionKeys.plots(),
    queryFn: ({ signal }) => fetchWorkPlots(signal),
  });
}

export function useWorkSession(id: number) {
  return useQuery({
    queryKey: workSessionKeys.detail(id),
    queryFn: ({ signal }) => fetchWorkSession(id, signal),
    enabled: Number.isFinite(id),
    staleTime: 5 * 60_000,
  });
}

export function useSessionChatMessages(id: number) {
  return useQuery({
    queryKey: workSessionKeys.chatMessages(id),
    queryFn: ({ signal }) => fetchSessionChatMessages(id, signal),
    enabled: Number.isFinite(id),
    staleTime: 0,
  });
}

/** 作業を始める。成功したら作業の詳細を入れておき、作業中の画面ですぐ出せるようにする */
export function useStartWorkSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startWorkSession,
    onSuccess: (session) => {
      queryClient.setQueryData(workSessionKeys.detail(session.id), session);
      void queryClient.invalidateQueries({ queryKey: workSessionKeys.myActive() });
    },
  });
}
