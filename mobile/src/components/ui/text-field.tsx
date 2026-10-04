import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

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
  onPress: () => void;
};

export type TextFieldProps = TextFieldTextProps | TextFieldTimeRangeProps;

export function TextField(props: TextFieldProps) {
  const { label, error, disabled = false, testID, style } = props;
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
        <Pressable
          accessibilityLabel={`${label} ${props.from}から${props.to}`}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={props.onPress}
          testID={testID}
          style={({ pressed }) => [fieldStyle, styles.timeRange, pressed && styles.pressed]}>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.value}>
            {props.from}
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.value}>
            〜
          </Text>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.value}>
            {props.to}
          </Text>
        </Pressable>
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
  disabledField: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.disabled,
  },
  errorField: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.medium,
    fontSize: 15,
    includeFontPadding: false,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
