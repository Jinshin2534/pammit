import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from '@/components/ui';
import { colors, radii, workTypeColors } from '@/theme/tokens';
import { WorkTypeKey } from './work-type-legend';

export type CalendarDayProps = { day: number; workTypes?: readonly WorkTypeKey[]; selected?: boolean; disabled?: boolean; isSunday?: boolean; isSaturday?: boolean; onPress?: () => void; testID?: string };
export function CalendarDay({ day, workTypes = [], selected = false, disabled = false, isSunday = false, isSaturday = false, onPress, testID }: CalendarDayProps) {
  const segments = workTypes.slice(0, 8);
  const radius = 19;
  const circumference = 2 * Math.PI * radius;
  const segment = segments.length ? circumference / segments.length : circumference;
  const dayColor = isSunday ? colors.sunday : isSaturday ? colors.saturday : colors.text;
  return <Pressable accessibilityLabel={`${day}日、予定${workTypes.length}件`} accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled || !onPress} onPress={onPress} testID={testID} style={({ pressed }) => [styles.day, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}><View style={styles.chart}>{segments.length > 0 && <Svg height="48" width="48" viewBox="0 0 48 48"><Circle cx="24" cy="24" r={radius} fill="none" stroke={colors.borderMuted} strokeDasharray="2 3" strokeWidth="3" />{segments.map((type, index) => <Circle key={`${type}-${index}`} cx="24" cy="24" r={radius} fill="none" transform="rotate(-90 24 24)" stroke={workTypeColors[type]} strokeDasharray={`${segment - 1} ${circumference - segment + 1}`} strokeDashoffset={-index * segment} strokeLinecap="round" strokeWidth="6" />)}</Svg>}<AppText variant="bodyBold" style={[styles.number, { color: dayColor }]}>{day}</AppText></View></Pressable>;
}
const styles = StyleSheet.create({ day: { alignItems: 'center', borderRadius: radii.full, height: 52, justifyContent: 'center', width: 52 }, chart: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 }, number: { position: 'absolute' }, selected: { backgroundColor: colors.primarySoft }, pressed: { opacity: 0.7 }, disabled: { opacity: 0.35 } });
