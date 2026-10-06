// 作業を始める画面（予定 → 農園 → 作業 → 帽子 → 確認）のあいだで渡す値。URL のパラメータなので文字列で持つ。
import { fromApiWorkType, workTypeKeys, type WorkTypeKey } from '@/lib/work-types';

export type WorkFlowParams = {
  /** 予定から始めたときの予定 ID */
  scheduleId?: string;
  plotId?: string;
  plotName?: string;
  /** 予定の作業（英語キーをカンマでつないだもの）。予定から始めたときだけ */
  workTypes?: string;
  /** 選んだ作業の英語キー */
  work?: string;
  /** 帽子を使うか。'1' か '0' */
  usesHat?: string;
};

/** 予定の作業（API の日本語）→ パラメータ */
export function scheduleWorkTypesParam(workTypes: readonly string[]): string {
  return workTypes.map(fromApiWorkType).join(',');
}

/** パラメータ → 選べる作業。予定から来たときは予定の作業だけ */
export function workTypeOptions(param: string | undefined): WorkTypeKey[] {
  if (!param) return workTypeKeys;
  const keys = param.split(',').filter((key): key is WorkTypeKey => (workTypeKeys as string[]).includes(key));
  return keys.length > 0 ? keys : workTypeKeys;
}

export function parseWorkTypeKey(value: string | undefined): WorkTypeKey | null {
  return value && (workTypeKeys as string[]).includes(value) ? (value as WorkTypeKey) : null;
}

export function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return value && Number.isInteger(id) && id > 0 ? id : null;
}

/** 後ろの画面へ渡すときに、空の値を落とす */
export function flowParams(params: WorkFlowParams): Record<string, string> {
  return Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== ''));
}
