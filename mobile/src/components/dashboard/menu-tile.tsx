import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radii, strokes } from '@/theme/tokens';

export type MenuTileProps = { title: string; description?: string; icon?: ReactNode; onPress: () => void; disabled?: boolean; testID?: string };
export function MenuTile({ title, description, icon, onPress, disabled = false, testID }: MenuTileProps) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} testID={testID} style={({ pressed }) => [styles.tile, pressed && styles.pressed, disabled && styles.disabled]}>{icon && <View style={styles.icon}>{icon}</View>}<AppText variant="bodyLgBold">{title}</AppText>{description && <AppText variant="caption" style={styles.description}>{description}</AppText>}</Pressable>;
}
const styles = StyleSheet.create({ tile: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, flex: 1, gap: 8, justifyContent: 'center', minHeight: 132, minWidth: 132, padding: 16 }, icon: { alignItems: 'center', height: 36, justifyContent: 'center' }, description: { color: colors.textSub, textAlign: 'center' }, pressed: { opacity: 0.7 }, disabled: { backgroundColor: colors.surfaceMuted, borderColor: colors.disabled, opacity: 0.6 } });
