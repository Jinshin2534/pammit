import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/ui';

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
      {onBack ? (
        <IconButton
          accessibilityLabel="戻る"
          icon={<Image accessible={false} contentFit="fill" source={require('../../../assets/icons/chevron-left.svg')} style={styles.backIcon} />}
          onPress={onBack}
          testID={testID ? `${testID}-back` : undefined}
        />
      ) : <View style={styles.backPlaceholder} />}
      <Button label={nextLabel} variant="cta" onPress={onNext} disabled={nextDisabled} loading={nextLoading} testID={testID ? `${testID}-next` : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', width: 281 },
  backIcon: { height: 59, width: 59 },
  backPlaceholder: { height: 48, width: 48 },
});
