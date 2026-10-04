import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';

export type AiAvatarProps = { size?: 'sm' | 'md'; testID?: string };
export function AiAvatar({ size = 'md', testID }: AiAvatarProps) {
  const scale = size === 'sm' ? 0.8 : 1;
  return <View accessibilityLabel="ぱみくん" style={[styles.avatar, { transform: [{ scale }] }]} testID={testID}><Image accessible={false} contentFit="fill" source={require('../../../assets/images/pamikun.png')} style={styles.image} /><AppText variant="small" style={styles.label}>ぱみくん</AppText></View>;
}
const styles = StyleSheet.create({
  avatar: { alignItems: 'center' },
  image: { height: 45.332, width: 68 },
  label: { lineHeight: 10 },
});
