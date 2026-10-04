import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useState } from 'react';
import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';

import { colors, fonts, radii, strokes } from '@/theme/tokens';

type TextFieldBaseProps = {
  label: string;
  error?: string;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
};

export type TextFieldTextProps = TextFieldBaseProps & {
  type?: 'text';
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  inputProps?: Omit<
    TextInputProps,
    'editable' | 'onChangeText' | 'placeholder' | 'style' | 'testID' | 'value'
  >;
};

export type TextFieldTimeRangeProps = TextFieldBaseProps & {
  type: 'time-range';
  from: string;
  to: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
};

export type TextFieldProps = TextFieldTextProps | TextFieldTimeRangeProps;

function timeToDate(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date;
}

function dateToTime(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function TextField(props: TextFieldProps) {
  const { label, error, disabled = false, testID, style } = props;
  const [activeTime, setActiveTime] = useState<'from' | 'to' | null>(null);
  const fieldStyle = [
    styles.field,
    disabled && styles.disabledField,
    error ? styles.errorField : undefined,
  ];

  return (
    <View style={[styles.container, style]}>
      <Text maxFontSizeMultiplier={1.2} style={styles.label}>
        {label}
      </Text>

      {props.type === 'time-range' ? (
        <View style={[fieldStyle, styles.timeRange]} testID={testID}>
          <Pressable
            accessibilityLabel={`${label}の開始時刻 ${props.from}`}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => setActiveTime('from')}
            style={({ pressed }) => [styles.timeButton, pressed && styles.pressed]}>
            <Text maxFontSizeMultiplier={1.2} style={styles.value}>{props.from}</Text>
          </Pressable>
          <Text maxFontSizeMultiplier={1.2} style={styles.value}>
            〜
          </Text>
          <Pressable
            accessibilityLabel={`${label}の終了時刻 ${props.to}`}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => setActiveTime('to')}
            style={({ pressed }) => [styles.timeButton, styles.timeButtonEnd, pressed && styles.pressed]}>
            <Text maxFontSizeMultiplier={1.2} style={styles.value}>{props.to}</Text>
          </Pressable>
          {activeTime ? (
            <ExpoDateTimePicker
              accentColor={colors.primary}
              display="default"
              is24Hour
              mode="time"
              onDismiss={() => setActiveTime(null)}
              onValueChange={(_, selectedDate) => {
                const nextValue = dateToTime(selectedDate);
                if (activeTime === 'from') props.onChangeFrom(nextValue);
                else props.onChangeTo(nextValue);
                setActiveTime(null);
              }}
              presentation="dialog"
              themeVariant="light"
              value={timeToDate(activeTime === 'from' ? props.from : props.to)}
            />
          ) : null}
        </View>
      ) : (
        <TextInput
          {...props.inputProps}
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          editable={!disabled}
          maxFontSizeMultiplier={1.2}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={colors.textSub}
          selectionColor={colors.primary}
          style={[fieldStyle, styles.input]}
          testID={testID}
          value={props.value}
        />
      )}

      {error ? (
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2} style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: 8,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 23,
    includeFontPadding: false,
    lineHeight: 25,
  },
  field: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radii.md,
    borderWidth: strokes.default,
    height: 58,
    paddingHorizontal: 20,
  },
  input: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 23,
    includeFontPadding: false,
    lineHeight: 25,
    paddingVertical: 0,
  },
  timeRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  value: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 23,
    includeFontPadding: false,
    lineHeight: 25,
  },
  timeButton: {
    alignItems: 'flex-start',
    height: 50,
    justifyContent: 'center',
    width: 67,
  },
  timeButtonEnd: { alignItems: 'flex-end' },
  disabledField: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.disabled,
  },
  errorField: {
    borderColor: colors.cta,
  },
  errorText: {
    color: colors.cta,
    fontFamily: fonts.medium,
    fontSize: 15,
    includeFontPadding: false,
    lineHeight: 18,
  },
  pressed: { opacity: 0.7 },
});
