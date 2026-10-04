import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { colors } from '@/theme/tokens';

export default function ButtonPreview() {
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <View style={styles.page}>
      <AppText variant="title">Button</AppText>
      <AppText variant="caption" style={styles.note}>
        Figmaのコンポーネント一覧と同じ8状態です。この説明は確認用で、本番画面には表示されません。
      </AppText>
      <View style={styles.figmaCanvas}>
        <ButtonRow variant="cta" />
        <ButtonRow variant="primary" />
        <ButtonRow variant="secondary" />
        <ButtonRow disabled />
      </View>
    </View>
  );
}

function ButtonRow({ variant = 'cta', disabled = false }: { variant?: 'cta' | 'primary' | 'secondary'; disabled?: boolean }) {
  return (
    <View style={styles.row}>
      <Button label="ボタン" variant={variant} disabled={disabled} onPress={() => undefined} />
      <View style={styles.largeSlot}>
        <Button label="ボタン" variant={variant} size="lg" disabled={disabled} onPress={() => undefined} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    gap: 12,
    paddingTop: 24,
  },
  note: {
    color: colors.textSub,
    maxWidth: 560,
    textAlign: 'center',
  },
  figmaCanvas: {
    backgroundColor: '#AAAAAA',
    gap: 22,
    height: 342,
    paddingLeft: 20,
    paddingTop: 20,
    width: 560,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 68,
  },
  largeSlot: {
    width: 281,
  },
});
