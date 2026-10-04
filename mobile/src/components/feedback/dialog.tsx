import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, IconButton } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type DialogProps = { visible: boolean; title: string; body?: string; children?: ReactNode; confirmLabel?: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean; testID?: string };
export function Dialog({ visible, title, body, children, confirmLabel = '決定', cancelLabel = 'キャンセル', onConfirm, onCancel, testID }: DialogProps) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}><Pressable accessibilityLabel="ダイアログを閉じる" onPress={onCancel} style={styles.backdrop}><Pressable accessibilityViewIsModal onPress={(event) => event.stopPropagation()} style={styles.dialog} testID={testID}><View style={styles.content}><View style={styles.question}><AppText variant="bodyLg" style={styles.title}>{title}</AppText>{body ? <AppText style={styles.body}>{body}</AppText> : null}{children}<Button label={confirmLabel} variant="cta" onPress={onConfirm} /></View><IconButton accessibilityLabel={cancelLabel} icon="back" onPress={onCancel} /></View></Pressable></Pressable></Modal>;
}
const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(217, 217, 217, 0.85)', flex: 1, justifyContent: 'center' },
  dialog: { backgroundColor: colors.accent, borderRadius: radii.md, paddingBottom: 39, paddingTop: 52, width: 309 },
  content: { alignSelf: 'center', gap: 28, width: 255 },
  question: { alignItems: 'center', gap: 29, width: '100%' },
  title: { lineHeight: 25, textAlign: 'center' },
  body: { lineHeight: 18, textAlign: 'center' },
});
