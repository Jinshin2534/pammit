import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FlowFooter, StepHeader } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { AppText, PinDot, PinKey, PinKeyValue, Radio } from '@/components/ui';

const pinRows: PinKeyValue[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['delete', '0'],
];

export default function InputAndFlowPreview() {
  const [choice, setChoice] = useState('予定から選ぶ');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState(1);

  if (!__DEV__) return <Redirect href="/" />;

  const handlePin = (value: PinKeyValue) => {
    if (value === 'delete') setPin((current) => current.slice(0, -1));
    else setPin((current) => current.length < 4 ? current + value : current);
  };

  return (
    <PageLayout
      header={<StepHeader title="入力部品の確認" current={step} total={4} onBack={() => setStep((value) => Math.max(1, value - 1))} testID="preview-step-header" />}
      footer={<FlowFooter onBack={() => setStep((value) => Math.max(1, value - 1))} onNext={() => setStep((value) => Math.min(4, value + 1))} nextDisabled={pin.length < 4} testID="preview-flow-footer" />}
      testID="input-and-flow-preview">
      <AppText variant="bodyLgBold">Radio</AppText>
      <Radio label="予定から選ぶ" selected={choice === '予定から選ぶ'} onPress={() => setChoice('予定から選ぶ')} testID="radio-schedule" />
      <Radio label="新しく始める" selected={choice === '新しく始める'} onPress={() => setChoice('新しく始める')} testID="radio-new" />

      <AppText variant="bodyLgBold">PinDot・PinKey</AppText>
      <View accessibilityLabel={`PINを${pin.length}文字入力済み`} style={styles.dots}>
        {Array.from({ length: 4 }, (_, index) => <PinDot key={index} filled={index < pin.length} testID={`pin-dot-${index}`} />)}
      </View>
      <View style={styles.keypad}>
        {pinRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keyRow}>
            {row.map((value) => <PinKey key={value} value={value} onPress={handlePin} testID={`pin-key-${value}`} />)}
          </View>
        ))}
      </View>
      <AppText testID="input-result">選択：{choice}／PIN：{pin.length}文字／手順：{step}</AppText>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  keypad: { alignItems: 'center', gap: 10 },
  keyRow: { flexDirection: 'row', gap: 18, justifyContent: 'center', minWidth: 228 },
});
