// 予定の API（一覧・登録・変更・削除と、担当者に選べる人）。
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from './client';
import type { AssigneeCandidate, Schedule, ScheduleCreate, ScheduleUpdate } from './types';

// ---- キー（invalidateQueries / setQueryData で使う） ----

export const scheduleKeys = {
  all: ['schedules'] as const,
  list: (from: string, to: string) => [...scheduleKeys.all, 'list', from, to] as const,
  assigneeCandidates: () => ['assignee-candidates'] as const,
};

// ---- 関数 ----

/** from / to は日本時間の "YYYY-MM-DD"（両端を含む）。省くとサーバーが今日から31日分にするので、必ず渡す */
export function fetchSchedules(from: string, to: string, signal?: AbortSignal) {
  return apiRequest<Schedule[]>('/schedules', { query: { from, to }, signal });
}

/** client_event_id は uuidV4()。送り直すときは同じ ID を使う */
export function createSchedule(body: ScheduleCreate) {
  return apiRequest<Schedule>('/schedules', { method: 'POST', body });
}

export function updateSchedule(id: number, body: ScheduleUpdate) {
  return apiRequest<Schedule>(`/schedules/${id}`, { method: 'PATCH', body });
}

export function deleteSchedule(id: number) {
  return apiRequest<void>(`/schedules/${id}`, { method: 'DELETE' });
}

export function fetchAssigneeCandidates(signal?: AbortSignal) {
  return apiRequest<AssigneeCandidate[]>('/assignee-candidates', { signal });
}

// ---- フック ----

/** 期間の予定。月を切り替えても前の月を出したまま読み込む */
export function useSchedules(from: string, to: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: scheduleKeys.list(from, to),
    queryFn: ({ signal }) => fetchSchedules(from, to, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

/** 予定の担当者に選べる人（停止していない人。owner も含む） */
export function useAssigneeCandidates() {
  return useQuery({
    queryKey: scheduleKeys.assigneeCandidates(),
    queryFn: ({ signal }) => fetchAssigneeCandidates(signal),
  });
}

/** 書いたあとはカレンダーとホームの予定を読み直す */
function useInvalidateSchedules() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
}

export function useCreateSchedule() {
  const invalidate = useInvalidateSchedules();
  return useMutation({ mutationFn: createSchedule, onSuccess: invalidate });
}

export function useUpdateSchedule() {
  const invalidate = useInvalidateSchedules();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ScheduleUpdate }) => updateSchedule(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteSchedule() {
  const invalidate = useInvalidateSchedules();
  return useMutation({ mutationFn: deleteSchedule, onSuccess: invalidate });
}
