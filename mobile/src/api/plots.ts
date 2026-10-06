// 農地の API。画面では「農園」と表示する。削除は PATCH { active: false }（停止）で行う。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from './client';
import type { Plot, PlotCreate, PlotUpdate } from './types';

// ---- キー ----

export const plotKeys = {
  all: ['plots'] as const,
  list: () => [...plotKeys.all, 'list'] as const,
};

// ---- 関数 ----

/** 削除（停止）した農地は返らない */
export function fetchPlots(signal?: AbortSignal) {
  return apiRequest<Plot[]>('/plots', { signal });
}

export function createPlot(body: PlotCreate) {
  return apiRequest<Plot>('/plots', { method: 'POST', body });
}

export function updatePlot(id: number, body: PlotUpdate) {
  return apiRequest<Plot>(`/plots/${id}`, { method: 'PATCH', body });
}

// ---- フック ----

export function usePlots() {
  return useQuery({
    queryKey: plotKeys.list(),
    queryFn: ({ signal }) => fetchPlots(signal),
  });
}

/** 農地を登録する（owner） */
export function useCreatePlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlot,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plotKeys.all }),
  });
}

/** 農地を変える（owner）。削除も { active: false } でこれを使う */
export function useUpdatePlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PlotUpdate }) => updatePlot(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plotKeys.all }),
  });
}
