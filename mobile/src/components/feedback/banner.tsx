import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

export type BannerKind = 'hat' | 'offline' | 'network';
export type BannerProps = { kind: BannerKind; message?: string; actionLabel?: string; onAction?: () => void; testID?: string };
const defaults: Record<BannerKind, string> = { hat: '帽子との接続が切れました。帽子の電源と距離を確認してください', offline: '通信が切れています。判定は端末に保存し、つながったら送信します', network: '通信が切れています。判定は端末に保存し、つながったら送信します' };
export function Banner({ kind, message = defaults[kind], actionLabel, onAction, testID }: BannerProps) {
  return <View accessibilityRole="alert" style={styles.banner} testID={testID}><View style={styles.icon}><AppText variant="bodyBold" style={styles.iconText}>!</AppText></View><AppText variant="body" style={styles.message}>{message}</AppText>{actionLabel && onAction && <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => pressed && styles.pressed}><AppText variant="bodyBold" style={styles.action}>{actionLabel}</AppText></Pressable>}</View>;
}
const styles = StyleSheet.create({
  banner: { alignItems: 'center', backgroundColor: colors.cta, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, width: '100%' },
  icon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 999, height: 24, justifyContent: 'center', width: 24 },
  iconText: { color: colors.cta, lineHeight: 25 },
  message: { color: colors.textInverse, flex: 1, lineHeight: 15 },
  action: { color: colors.textInverse, textDecorationLine: 'underline' },
  pressed: { opacity: 0.7 },
});
