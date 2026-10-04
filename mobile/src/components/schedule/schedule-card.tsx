import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';
import { WorkTypeKey } from './work-type-legend';

export type ScheduleCardProps = { start: string; end: string; work: string; workType: WorkTypeKey; place: string; members: readonly string[]; note?: string; onPress?: () => void; testID?: string };
export function ScheduleCard({ start, end, work, workType, place, members, note, onPress, testID }: ScheduleCardProps) {
  const shown = members.slice(0, 5);
  const extra = Math.max(0, members.length - shown.length);
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} testID={testID} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.time}><AppText>{start}</AppText><View style={styles.line} /><AppText>{end}</AppText></View>
    <AppText variant="bodyLg" style={styles.work}>{work}</AppText>
    <View style={styles.details}>
      <View style={styles.detailRow}><AppText variant="small">場所</AppText><AppText variant="caption">{place}</AppText></View>
      <View style={styles.detailRow}><AppText variant="small">担当</AppText><AppText variant="caption" numberOfLines={1}>{shown.join('・') || '未指定'}{extra > 0 ? `・ほか${extra}名` : ''}</AppText></View>
      {note && <View style={styles.detailRow}><AppText variant="small">備考</AppText><AppText variant="caption" numberOfLines={1}>{note}</AppText></View>}
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.primary, borderRadius: radii.md, flexShrink: 0, gap: 12, height: 134, paddingBottom: 10, paddingHorizontal: 11, paddingTop: 8, width: 181 }, time: { alignItems: 'center', flexDirection: 'row', gap: 3 }, line: { backgroundColor: colors.text, height: 1, width: 40 }, work: { color: colors.textInverse, lineHeight: 25 }, details: { gap: 3 }, detailRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 13 }, pressed: { opacity: 0.7 } });
