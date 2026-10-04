import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type MenuTileProps = {
  title: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
};

export function MenuTile({ title, icon, onPress, disabled = false, testID }: MenuTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed, disabled && styles.disabled]}>
      <AppText variant="bodyLg" numberOfLines={1} style={styles.title}>{title}</AppText>
      <View style={styles.icon}>{icon}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, flexShrink: 0, gap: 4, height: 136, overflow: 'hidden', paddingTop: 8, width: 167 },
  title: { color: colors.textInverse, textAlign: 'center' },
  icon: { alignItems: 'center', height: 96, justifyContent: 'center', width: 96 },
  pressed: { opacity: 0.7 },
  disabled: { backgroundColor: colors.disabled, opacity: 0.6 },
});
