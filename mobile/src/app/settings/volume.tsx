import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsFrame } from '@/components/settings/settings-frame';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export default function VolumeScreen() {
  const [volume, setVolume] = useState(65);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SettingsFrame onSave={save} saved={saved} testID="volume-screen">
      <AppText variant="title" style={styles.title}>音量</AppText>
      <View style={styles.slider}>
        <ControlButton kind="minus" onPress={() => setVolume((value) => Math.max(0, value - 10))} />
        <View style={styles.bar} accessibilityLabel={`音量${volume}パーセント`}>
          <View style={[styles.barFill, { width: `${volume}%` }]} />
        </View>
        <ControlButton kind="plus" onPress={() => setVolume((value) => Math.min(100, value + 10))} />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => undefined}
        style={({ pressed }) => [styles.tryButton, pressed && styles.pressed]}
        testID="volume-preview">
        <AppText variant="bodyLg" style={styles.buttonText}>試しに聞く</AppText>
      </Pressable>
    </SettingsFrame>
  );
}

function ControlButton({ kind, onPress }: { kind: 'minus' | 'plus'; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={kind === 'minus' ? '音量を小さくする' : '音量を大きくする'}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.control, pressed && styles.pressed]}>
      <View style={styles.horizontalBar} />
      {kind === 'plus' && <View style={styles.verticalBar} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    lineHeight: 51,
    textAlign: 'center',
  },
  slider: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
  },
  control: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    height: 48,
    justifyContent: 'center',
    position: 'relative',
    width: 48,
  },
  horizontalBar: {
    backgroundColor: colors.textInverse,
    borderRadius: 1.5,
    height: 3,
    width: 18,
  },
  verticalBar: {
    backgroundColor: colors.textInverse,
    borderRadius: 1.5,
    height: 18,
    position: 'absolute',
    width: 3,
  },
  bar: {
    backgroundColor: '#F7F7F7',
    borderRadius: radii.full,
    flex: 1,
    height: 22,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: colors.primary,
    height: 32,
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
