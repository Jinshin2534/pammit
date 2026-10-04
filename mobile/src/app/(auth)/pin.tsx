import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PammitLogo } from '@/components/branding';
import { FlowFooter } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, PinDot, PinKey, PinKeyValue, SmallButton } from '@/components/ui';
import { colors } from '@/theme/tokens';

const rows: PinKeyValue[][] = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['delete', '0']];

export default function PinScreen() {
  const { userName = '利用者' } = useLocalSearchParams<{ userName?: string }>();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const pressKey = (value: PinKeyValue) => {
    setError('');
    if (value === 'delete') setPin((current) => current.slice(0, -1));
    else setPin((current) => current.length < 4 ? current + value : current);
  };

  const login = () => {
    if (pin.length !== 4) return setError('4桁のPINを入力してください');
    router.replace('/(tabs)');
  };

  return (
    <PageLayout
      variant="centered"
      header={<ScreenHeader title="PINを入力" showBack onBack={() => router.back()} topPadding={16} />}
      footer={<FlowFooter nextLabel="ログイン" onNext={login} nextDisabled={pin.length !== 4} testID="pin-footer" />}
      testID="pin-screen">
      <PammitLogo compact />
      <View style={styles.user}>
        <AppText variant="bodyLgBold">{userName} さん</AppText>
        <SmallButton label="別の人でログイン" variant="outline" onPress={() => router.replace('/(auth)/role')} />
      </View>
      <View accessibilityLabel={`PINを${pin.length}文字入力済み`} style={styles.dots}>
        {Array.from({ length: 4 }, (_, index) => <PinDot key={index} filled={index < pin.length} testID={`pin-dot-${index}`} />)}
      </View>
      {error && <AppText style={styles.error}>{error}</AppText>}
      <View style={styles.keypad}>
        {rows.map((row, index) => <View key={index} style={styles.row}>{row.map((value) => <PinKey key={value} value={value} onPress={pressKey} testID={`pin-key-${value}`} />)}</View>)}
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  user: { alignItems: 'center', gap: 8 },
  dots: { flexDirection: 'row', gap: 18, justifyContent: 'center' },
  keypad: { alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 18, justifyContent: 'center', minWidth: 228 },
  error: { color: colors.cta, textAlign: 'center' },
});
