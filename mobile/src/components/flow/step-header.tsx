import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation/screen-header';
import { StepIndicator } from './step-indicator';

export type StepHeaderProps = {
  title: string;
  current: number;
  total: number;
  onBack: () => void;
  testID?: string;
};

export function StepHeader({ title, current, total, onBack, testID }: StepHeaderProps) {
  return (
    <View style={styles.header} testID={testID}>
      <ScreenHeader title={title} showBack onBack={onBack} topPadding={16} testID={testID ? `${testID}-title` : undefined} />
      <StepIndicator current={current} total={total} testID={testID ? `${testID}-indicator` : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({ header: { gap: 2, paddingBottom: 12 } });
