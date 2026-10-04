import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type AiAvatarProps = { size?: 'sm' | 'md'; testID?: string };
export function AiAvatar({ size = 'md', testID }: AiAvatarProps) {
  const pixels = size === 'sm' ? 36 : 52;
  return <View accessibilityLabel="パミットAI" style={[styles.avatar, { height: pixels, width: pixels }]} testID={testID}><AppText variant={size === 'sm' ? 'captionBold' : 'bodyBold'} style={styles.label}>AI</AppText></View>;
}
const styles = StyleSheet.create({ avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primary, borderRadius: radii.full, borderWidth: 3, justifyContent: 'center' }, label: { color: colors.textDeep } });
