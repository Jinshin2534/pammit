// 作業の種類。画面と色は英語キー（theme の workTypeColors）、API は日本語（WorkType）で持つ。
import type { ApiWorkType } from '@/api/types';
import type { workTypeColors } from '@/theme/tokens';

export type WorkTypeKey = keyof typeof workTypeColors;

const apiByKey = {
  prune: '剪定',
  irrigate: '灌水',
  fertilize: '肥料',
  thinning: '摘果・摘葉',
  harvest: '収穫',
  spray: '防除',
  mow: '草刈り',
  other: 'その他',
} as const satisfies Record<WorkTypeKey, ApiWorkType>;

const keyByApi = Object.fromEntries(Object.entries(apiByKey).map(([key, label]) => [label, key])) as Record<ApiWorkType, WorkTypeKey>;

/** 画面の並び順（API の enum と同じ順） */
export const workTypeKeys = Object.keys(apiByKey) as WorkTypeKey[];

/** 英語キー → API の値。API の値はそのまま画面の表示名にも使える */
export function toApiWorkType(key: WorkTypeKey): ApiWorkType {
  return apiByKey[key];
}

/** API の値 → 英語キー。知らない値は other にする */
export function fromApiWorkType(value: string): WorkTypeKey {
  return keyByApi[value as ApiWorkType] ?? 'other';
}

/** 画面に出す名前（「摘果・摘葉」など） */
export function workTypeLabel(key: WorkTypeKey): string {
  return apiByKey[key];
}

/** 帽子で判定する作業 */
export function isHatWorkType(key: WorkTypeKey): boolean {
  return key === 'thinning' || key === 'harvest';
}
