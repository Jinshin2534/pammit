import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radii, workTypeColors } from '@/theme/tokens';
import { WorkTypeKey } from './work-type-legend';

export type ScheduleCardProps = { start: string; end: string; work: string; workType: WorkTypeKey; place: string; members: readonly string[]; note?: string; onPress?: () => void; testID?: string };
export function ScheduleCard({ start, end, work, workType, place, members, note, onPress, testID }: ScheduleCardProps) {
  const shown = members.slice(0, 5);
  const extra = Math.max(0, members.length - shown.length);
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} testID={testID} style={({ pressed }) => [styles.card, { borderLeftColor: workTypeColors[workType] }, pressed && styles.pressed]}><View style={styles.heading}><AppText variant="bodyBold">{start} 〜 {end}</AppText><View style={[styles.badge, { backgroundColor: workTypeColors[workType] }]}><AppText variant="small">{work}</AppText></View></View><AppText variant="bodyLgBold">{place}</AppText><AppText variant="caption">担当　{shown.join('・') || '未指定'}{extra > 0 ? `・ほか${extra}名` : ''}</AppText>{note && <AppText variant="caption" style={styles.note}>備考　{note}</AppText>}</Pressable>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderColor: colors.disabled, borderLeftWidth: 8, borderRadius: radii.md, borderWidth: 1, gap: 8, minHeight: 142, padding: 16, width: 260 }, heading: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' }, badge: { borderRadius: radii.full, paddingHorizontal: 9, paddingVertical: 4 }, note: { color: colors.textSub }, pressed: { opacity: 0.7 } });
