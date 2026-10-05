// 農地の API。画面では「農園」と表示する。
import { useQuery } from '@tanstack/react-query';

import { apiRequest } from './client';
import type { Plot } from './types';

export const plotKeys = {
  all: ['plots'] as const,
  list: () => [...plotKeys.all, 'list'] as const,
};

/** 削除していない農地の一覧 */
export function fetchPlots(signal?: AbortSignal) {
  return apiRequest<Plot[]>('/plots', { signal });
}

export function usePlots() {
  return useQuery({
    queryKey: plotKeys.list(),
    queryFn: ({ signal }) => fetchPlots(signal),
  });
}
