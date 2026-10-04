import { StyleSheet, View } from 'react-native';

import { Button, SmallButton } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

export type FlowFooterProps = {
  nextLabel?: string;
  onNext: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  testID?: string;
};

export function FlowFooter({ nextLabel = '次へ', onNext, onBack, nextDisabled = false, nextLoading = false, testID }: FlowFooterProps) {
  return (
    <View style={styles.footer} testID={testID}>
      {onBack && <SmallButton label="戻る" variant="outline" onPress={onBack} testID={testID ? `${testID}-back` : undefined} />}
      <Button label={nextLabel} variant="cta" onPress={onNext} disabled={nextDisabled} loading={nextLoading} style={styles.next} testID={testID ? `${testID}-next` : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.disabled, borderTopWidth: 1, flexDirection: 'row', gap: spacing.gap, paddingHorizontal: spacing.pageX, paddingTop: 12 },
  next: { flex: 1 },
});
