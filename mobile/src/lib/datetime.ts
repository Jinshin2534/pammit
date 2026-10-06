// 日時の変換。API はタイムゾーン付きの ISO 8601（多くは UTC）、画面は日本時間（JST、+09:00、夏時間なし）。
// 日付だけの値（"YYYY-MM-DD"）と時刻だけの値（"HH:MM:SS"）は API でも日本時間のまま扱う。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');

/** 日本時間での年月日と時分秒 */
export function jstParts(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    /** 0 が日曜 */
    weekday: shifted.getUTCDay(),
  };
}

/** 日時 → 日本時間の "YYYY-MM-DD" */
export function toJstDate(value: string | Date): string {
  const { year, month, day } = jstParts(value);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 日時 → 日本時間の "HH:MM" */
export function toJstTime(value: string | Date): string {
  const { hour, minute } = jstParts(value);
  return `${pad(hour)}:${pad(minute)}`;
}

/** 今日（日本時間）の "YYYY-MM-DD" */
export function todayJst(now: Date = new Date()): string {
  return toJstDate(now);
}

/** 日本時間の日付と "HH:MM" → API に送る "YYYY-MM-DDTHH:MM:00+09:00" */
export function jstToIso(date: string, time: string): string {
  return `${date}T${toApiTime(time)}+09:00`;
}

/** 今の時刻を API に送る形で（UTC） */
export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

/** API の時刻 "HH:MM:SS" → 画面の "HH:MM"。null はそのまま */
export function fromApiTime(value: string): string;
export function fromApiTime(value: string | null | undefined): string | null;
export function fromApiTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

/** 画面の "HH:MM" → API の "HH:MM:SS" */
export function toApiTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

/** 終わりの日時までの残り（ミリ秒）。過ぎていれば 0 */
export function msUntil(value: string | Date, now: Date = new Date()): number {
  const target = typeof value === 'string' ? new Date(value) : value;
  return Math.max(0, target.getTime() - now.getTime());
}
