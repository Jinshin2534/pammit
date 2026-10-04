import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsFrame } from '@/components/settings/settings-frame';
import { AppText } from '@/components/ui';
import { colors, radii, strokes } from '@/theme/tokens';

const devices = [
  { key: 'camera', label: 'カメラ' },
  { key: 'microphone', label: 'マイク' },
  { key: 'speaker', label: 'スピーカー' },
] as const;

type DeviceKey = (typeof devices)[number]['key'];

export default function SettingsHatScreen() {
  const { connected: connectedParam } = useLocalSearchParams<{ connected?: string }>();
  const initiallyConnected = connectedParam === '1';
  const [connected, setConnected] = useState<Record<DeviceKey, boolean>>({
    camera: initiallyConnected,
    microphone: initiallyConnected,
    speaker: initiallyConnected,
  });
  const allConnected = devices.every(({ key }) => connected[key]);

  return (
    <SettingsFrame testID="settings-hat-screen">
      <AppText variant="title" style={styles.title}>帽子の接続</AppText>
      <View style={styles.list}>
        {devices.map(({ key, label }) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: connected[key] }}
            onPress={() => setConnected((current) => ({ ...current, [key]: !current[key] }))}
            testID={`hat-${key}`}
            style={({ pressed }) => [styles.item, connected[key] && styles.itemSelected, pressed && styles.pressed]}>
            <AppText variant="bodyLg" style={connected[key] && styles.selectedText}>{label}</AppText>
          </Pressable>
        ))}
      </View>
      <AppText variant="caption" numberOfLines={1} style={styles.caption}>
        {allConnected ? 'すべて接続済み' : '帽子の電源を入れて、近くに置いてください'}
      </AppText>
    </SettingsFrame>
  );
}

const styles = StyleSheet.create({
  title: {
    lineHeight: 51,
    textAlign: 'center',
  },
  list: {
    alignSelf: 'stretch',
    gap: 20,
  },
  item: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radii.md,
    borderWidth: strokes.default,
    height: 58,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  itemSelected: {
    backgroundColor: colors.accent,
  },
  selectedText: {
    color: colors.textInverse,
  },
  caption: {
    color: colors.textSub,
    lineHeight: 13,
    marginHorizontal: -20,
    textAlign: 'center',
    width: 320,
  },
  pressed: {
    opacity: 0.7,
  },
});
