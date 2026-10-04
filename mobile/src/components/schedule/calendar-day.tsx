import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { colors, fonts, radii, workTypeColors } from '@/theme/tokens';
import { WorkTypeKey } from './work-type-legend';

export type CalendarDayProps = {
  day: number;
  workTypes?: readonly WorkTypeKey[];
  selected?: boolean;
  disabled?: boolean;
  muted?: boolean;
  isToday?: boolean;
  isSunday?: boolean;
  isSaturday?: boolean;
  onPress?: () => void;
  testID?: string;
};

export function CalendarDay({ day, workTypes = [], selected = false, disabled = false, muted = false, isToday = false, isSunday = false, isSaturday = false, onPress, testID }: CalendarDayProps) {
  const segments = workTypes.slice(0, 8);
  const radius = 7.5;
  const circumference = 2 * Math.PI * radius;
  const segment = segments.length ? circumference / segments.length : circumference;
  const dayColor = isToday ? colors.primary : isSunday ? colors.sunday : isSaturday ? colors.saturday : colors.textSub;

  return (
    <Pressable
      accessibilityLabel={`${day}日、予定${workTypes.length}件`}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.day, pressed && styles.pressed, disabled && styles.disabled]}>
      {selected ? <View style={styles.selected} /> : null}
      <View style={styles.visual}>
        {muted ? (
          <View style={styles.mutedChart} />
        ) : (
          <Svg height={31} width={31.714} viewBox="0 0 31.714 31">
          {segments.length === 0 ? (
            <Circle cx={15.857} cy={15.5} r={12} fill="none" stroke={colors.primary} strokeDasharray="4 4" strokeWidth={3} />
          ) : segments.map((type, index) => (
            <Circle
              key={`${type}-${index}`}
              cx={15.857}
              cy={15.5}
              r={radius}
              fill="none"
              transform="rotate(-90 15.857 15.5)"
              stroke={workTypeColors[type]}
              strokeDasharray={`${segment} ${circumference - segment}`}
              strokeDashoffset={-index * segment}
              strokeWidth={15}
            />
          ))}
          </Svg>
        )}
      </View>
      <AppText style={[styles.number, { color: dayColor, fontFamily: isToday ? fonts.bold : fonts.medium }]}>
        {String(day).padStart(2, '0')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  day: { alignItems: 'center', height: 59, position: 'relative', width: 31.714 },
  number: { fontSize: 23, lineHeight: 28, position: 'relative', textAlign: 'center', zIndex: 1 },
  selected: { backgroundColor: colors.primarySoft, borderRadius: radii.md, bottom: -2, left: -4, position: 'absolute', right: -4, top: -2, zIndex: 0 },
  visual: { position: 'relative', zIndex: 1 },
  mutedChart: { backgroundColor: '#AEAEAE', borderRadius: radii.full, height: 31, width: 31.714 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
});
