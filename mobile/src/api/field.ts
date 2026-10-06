// 農園画面の API（農地ごとの土壌水分・助言・天気と、データ推移）。
// 農地の一覧・登録・変更は plots.ts。キーは plots の下に置き、農地を変えたら一緒に取り直されるようにする。
import { useQuery } from '@tanstack/react-query';

import { apiRequest } from './client';
import type { FieldSummary, SensorReadingOut } from './types';

// ---- キー ----

export const fieldKeys = {
  all: ['plots'] as const,
  summaries: () => [...fieldKeys.all, 'summary'] as const,
  hourlyReadings: (plotId: number) => [...fieldKeys.all, plotId, 'sensor-readings', 'hour'] as const,
};

// ---- 関数 ----

/** 削除していない全農地の農園画面の中身（切り替え用） */
export function fetchFieldSummaries(signal?: AbortSignal) {
  return apiRequest<FieldSummary[]>('/plots/summary', { signal });
}

/** 過去7日（今日を含む）の1時間ごとの平均。新しい順で返る */
export function fetchHourlyReadings(plotId: number, signal?: AbortSignal) {
  return apiRequest<SensorReadingOut[]>(`/plots/${plotId}/sensor-readings`, { query: { interval: 'hour' }, signal });
}

// ---- フック ----

/** 農園画面。失敗しても前の値（data）は残る */
export function useFieldSummaries(enabled = true) {
  return useQuery({
    queryKey: fieldKeys.summaries(),
    queryFn: ({ signal }) => fetchFieldSummaries(signal),
    enabled,
  });
}

/** データ推移のグラフ */
export function useHourlyReadings(plotId: number | null) {
  return useQuery({
    queryKey: fieldKeys.hourlyReadings(plotId ?? 0),
    queryFn: ({ signal }) => fetchHourlyReadings(plotId as number, signal),
    enabled: plotId !== null,
  });
}
