// 今日のひとことの API。ホームと「詳しく」の画面で同じキーを使い、同じ内容を出す。
import { useQuery } from '@tanstack/react-query';

import { todayJst } from '@/lib/datetime';

import { apiRequest } from './client';
import type { DailyAdvice } from './types';

export const dailyAdviceKeys = {
  all: ['daily-advice'] as const,
  byDate: (date: string) => [...dailyAdviceKeys.all, date] as const,
};

/** date は日本時間の "YYYY-MM-DD" */
export function fetchDailyAdvice(date: string, signal?: AbortSignal) {
  return apiRequest<DailyAdvice>('/daily-advice', { query: { date }, signal });
}

/** 今日（日本時間）のひとこと。朝に1回作られるので長めに使い回す */
export function useDailyAdvice(date: string = todayJst()) {
  return useQuery({
    queryKey: dailyAdviceKeys.byDate(date),
    queryFn: ({ signal }) => fetchDailyAdvice(date, signal),
    staleTime: 10 * 60_000,
  });
}
