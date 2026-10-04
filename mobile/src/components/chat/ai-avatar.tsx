import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

export type AiAvatarProps = { size?: 'sm' | 'md'; testID?: string };
export function AiAvatar({ size = 'md', testID }: AiAvatarProps) {
  const scale = size === 'sm' ? 0.72 : 1;
  return <View accessibilityLabel="ぱみくん" style={styles.avatar} testID={testID}>
    <Image accessible={false} source={require('../../../assets/images/pamikun.png')} contentFit="cover" style={{ height: 45.332 * scale, width: 68 * scale }} />
    <AppText variant="small" style={styles.label}>ぱみくん</AppText>
  </View>;
}
const styles = StyleSheet.create({ avatar: { alignItems: 'center' }, label: { color: colors.text, lineHeight: 10 } });
