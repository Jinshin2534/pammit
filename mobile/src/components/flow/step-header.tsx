import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { StepIndicator } from './step-indicator';

export type StepHeaderProps = {
  title: string;
  current: number;
  total: number;
  onBack: () => void;
  testID?: string;
};

export function StepHeader({ title, current, total, onBack, testID }: StepHeaderProps) {
  void onBack;
  return (
    <View style={styles.header} testID={testID}>
      <StepIndicator current={current} total={total} testID={testID ? `${testID}-indicator` : undefined} />
      <AppText variant="bodyLg" style={styles.title} testID={testID ? `${testID}-title` : undefined}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', alignSelf: 'center', gap: 38, width: 299 },
  title: { alignSelf: 'stretch', lineHeight: 25, textAlign: 'center' },
});
