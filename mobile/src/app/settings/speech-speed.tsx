import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsFrame } from '@/components/settings/settings-frame';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

const speeds = ['はやい', 'ふつう', 'ゆっくり', 'すごくゆっくり'] as const;
type Speed = (typeof speeds)[number];

export default function SpeechSpeedScreen() {
  const [speed, setSpeed] = useState<Speed>('ふつう');
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SettingsFrame onSave={save} saved={saved} testID="speech-speed-screen">
      <AppText variant="title" style={styles.title}>話す速さ</AppText>
      <View accessibilityRole="radiogroup" style={styles.speedList}>
        {speeds.map((label) => {
          const selected = speed === label;
          return (
            <Pressable
              key={label}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setSpeed(label)}
              style={({ pressed }) => [
                styles.speedRow,
                label === 'すごくゆっくり' && styles.longSpeedRow,
                pressed && styles.pressed,
              ]}
              testID={`speed-${label}`}>
              <View style={[styles.radio, selected && styles.radioSelected]} />
              <AppText variant="bodyLg" style={styles.speedLabel}>{label}</AppText>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => undefined}
        style={({ pressed }) => [styles.tryButton, pressed && styles.pressed]}
        testID="speech-preview">
        <AppText variant="bodyLg" style={styles.buttonText}>試しに聞く</AppText>
      </Pressable>
    </SettingsFrame>
  );
}

const styles = StyleSheet.create({
  title: {
    lineHeight: 51,
    textAlign: 'center',
  },
  speedList: {
    height: 156,
    justifyContent: 'space-between',
    width: 213,
  },
  speedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 15,
    height: 30,
    width: '100%',
  },
  longSpeedRow: {
    paddingLeft: 3.5,
  },
  radio: {
    borderColor: colors.primary,
    borderRadius: radii.full,
    borderStyle: 'dashed',
    borderWidth: 3,
    height: 30,
    width: 30,
  },
  radioSelected: {
    backgroundColor: colors.primary,
    borderStyle: 'solid',
  },
  speedLabel: {
    lineHeight: 25,
  },
  tryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 24,
    width: 171,
  },
  buttonText: {
    color: colors.textInverse,
    lineHeight: 25,
  },
  pressed: {
    opacity: 0.7,
  },
});
