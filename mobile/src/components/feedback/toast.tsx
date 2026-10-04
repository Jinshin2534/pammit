import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type ToastProps = { message: string; visible: boolean; kind?: 'success' | 'error'; testID?: string };
export function Toast({ message, visible, kind = 'success', testID }: ToastProps) {
  if (!visible) return null;
  return <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.toast, kind === 'error' && styles.error]} testID={testID}><AppText variant="bodyBold" style={styles.text}>{message}</AppText></View>;
}
const styles = StyleSheet.create({ toast: { alignSelf: 'center', backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 24, paddingVertical: 12 }, error: { backgroundColor: colors.cta }, text: { color: colors.textInverse, lineHeight: 25 } });
