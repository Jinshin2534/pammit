import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, TextField } from '@/components/ui';
import { colors } from '@/theme/tokens';

export default function TextFieldPreview() {
  const [value, setValue] = useState('入力内容');
  const [from, setFrom] = useState('08:00');
  const [to, setTo] = useState('17:00');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <View style={styles.page}>
      <AppText variant="title">TextField</AppText>
      <AppText variant="caption" style={styles.note}>
        灰色の枠内がFigmaにある2種類です。見出し以外の説明は確認用で、本番画面には表示されません。
      </AppText>
      <Link href="/dev/all-components" style={styles.link}>
        TextField以外の全部品を見る
      </Link>
      <View style={styles.figmaCanvas}>
        <View style={styles.fieldSlot}>
          <TextField label="見出し" value={value} onChangeText={setValue} />
        </View>
        <View style={styles.fieldSlot}>
          <TextField
            type="time-range"
            label="見出し"
            from={from}
            to={to}
            onChangeFrom={setFrom}
            onChangeTo={setTo}
          />
        </View>
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
    maxWidth: 626,
    textAlign: 'center',
  },
  link: {
    color: colors.primary,
    fontSize: 18,
    textDecorationLine: 'underline',
  },
  figmaCanvas: {
    backgroundColor: '#AAAAAA',
    flexDirection: 'row',
    gap: 25,
    height: 133,
    paddingHorizontal: 20,
    paddingTop: 20,
    width: 626,
  },
  fieldSlot: {
    width: 281,
  },
});
