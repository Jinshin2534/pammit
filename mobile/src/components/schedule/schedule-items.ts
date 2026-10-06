// API の予定を画面のカードに変える。1つの予定に作業が複数あれば、作業ごとにカードを分ける（データは1件のまま）。
import type { Schedule } from '@/api/types';
import { fromApiTime } from '@/lib/datetime';
import { fromApiWorkType, workTypeLabel } from '@/lib/work-types';

import type { ScheduleRowItem } from './schedule-row';
import type { WorkTypeKey } from './work-type-legend';

/** カードに出す担当は5人まで。6人以上は「ほかN名」 */
export const MAX_CARD_MEMBERS = 5;

export function memberSummary(members: readonly string[], max = MAX_CARD_MEMBERS) {
  const shown = members.slice(0, max);
  const extra = Math.max(0, members.length - shown.length);
  return `${shown.join('・') || '未指定'}${extra > 0 ? `・ほか${extra}名` : ''}`;
}

/** 前の形で入れた予定だけ時刻がない */
export function scheduleTime(value: string | null | undefined) {
  return fromApiTime(value) ?? '--:--';
}

export type ScheduleCardItem = ScheduleRowItem & { scheduleId: number };

/** カードの id は「予定の id:作業」。押されたカードから scheduleId で予定を引く */
export function toScheduleCards(schedules: readonly Schedule[]): ScheduleCardItem[] {
  return schedules
    .flatMap((schedule) => {
      const types = schedule.work_types.length ? schedule.work_types : ['その他'];
      return types.map((type) => {
        const key = fromApiWorkType(type);
        return {
          id: `${schedule.id}:${type}`,
          scheduleId: schedule.id,
          start: scheduleTime(schedule.start_time),
          end: scheduleTime(schedule.end_time),
          work: workTypeLabel(key),
          workType: key,
          place: schedule.plot_name,
          members: schedule.assignees.map((assignee) => assignee.name),
          note: schedule.note ?? undefined,
        };
      });
    })
    .sort((a, b) => a.start.localeCompare(b.start) || a.scheduleId - b.scheduleId);
}

/** その日の作業の種類（カレンダーの円）。同じ種類は1つにまとめ、最大8つ */
export function workTypesOf(schedules: readonly Schedule[]): WorkTypeKey[] {
  return [...new Set(schedules.flatMap((schedule) => schedule.work_types.map(fromApiWorkType)))].slice(0, 8);
}
