import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

export type BannerKind = 'hat' | 'network';
export type BannerProps = { kind: BannerKind; message?: string; actionLabel?: string; onAction?: () => void; testID?: string };
const defaults: Record<BannerKind, string> = { hat: '帽子との接続が切れました。帽子の電源と距離を確認してください', network: '通信が切れています。通信が必要な機能は利用できません' };
export function Banner({ kind, message = defaults[kind], actionLabel, onAction, testID }: BannerProps) {
  return <View accessibilityRole="alert" style={styles.banner} testID={testID}><AppText variant="bodyBold" style={styles.icon}>{kind === 'hat' ? '帽子' : '通信'}</AppText><AppText style={styles.message}>{message}</AppText>{actionLabel && onAction && <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => pressed && styles.pressed}><AppText variant="bodyBold" style={styles.action}>{actionLabel}</AppText></Pressable>}</View>;
}
const styles = StyleSheet.create({ banner: { alignItems: 'center', backgroundColor: colors.cta, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 }, icon: { color: colors.textInverse }, message: { color: colors.textInverse, flex: 1 }, action: { color: colors.textInverse, textDecorationLine: 'underline' }, pressed: { opacity: 0.7 } });
