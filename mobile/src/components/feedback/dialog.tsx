import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, SmallButton } from '@/components/ui';
import { colors, radii, spacing } from '@/theme/tokens';

export type DialogProps = { visible: boolean; title: string; body?: string; children?: ReactNode; confirmLabel?: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean; testID?: string };
export function Dialog({ visible, title, body, children, confirmLabel = '決定', cancelLabel = 'キャンセル', onConfirm, onCancel, testID }: DialogProps) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}><Pressable accessibilityLabel="ダイアログを閉じる" onPress={onCancel} style={styles.backdrop}><Pressable accessibilityViewIsModal onPress={(event) => event.stopPropagation()} style={styles.dialog} testID={testID}><AppText variant="bodyLgBold">{title}</AppText>{body && <AppText>{body}</AppText>}{children}<View style={styles.actions}><SmallButton label={cancelLabel} variant="outline" onPress={onCancel} /><Button label={confirmLabel} variant="cta" onPress={onConfirm} style={styles.confirm} /></View></Pressable></Pressable></Modal>;
}
const styles = StyleSheet.create({ backdrop: { alignItems: 'center', backgroundColor: 'rgba(80, 80, 80, 0.62)', flex: 1, justifyContent: 'center', padding: spacing.pageX }, dialog: { backgroundColor: colors.surface, borderRadius: radii.md, gap: spacing.gap, maxWidth: 480, padding: 24, width: '100%' }, actions: { alignItems: 'center', flexDirection: 'row', gap: 12 }, confirm: { flex: 1 } });
