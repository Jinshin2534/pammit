import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

type KeyValue = `${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | 'submit' | 'delete';

const rows: readonly (readonly KeyValue[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['submit', '0', 'delete'],
];

const submitIcon = require('../../../assets/figma/auth-home/pin-04.svg');
const deleteIcon = require('../../../assets/figma/auth-home/pin-05.svg');

export default function PinScreen() {
  const { userName = '近未来 すだち子' } = useLocalSearchParams<{ userName?: string }>();
  const [pin, setPin] = useState('');

  const pressKey = (value: KeyValue) => {
    if (value === 'submit') {
      if (pin.length === 4) router.replace('/(tabs)');
      return;
    }
    if (value === 'delete') {
      setPin((current) => current.slice(0, -1));
      return;
    }
    setPin((current) => (current.length < 4 ? current + value : current));
  };

  return (
    <PageLayout
      background={<HeaderBackground position="top" />}
      header={<ScreenHeader title="PINを入力" />}
      scrollable={false}
      testID="pin-screen">
      <View style={styles.welcomeSlot}>
        <AppText variant="bodyLg" numberOfLines={1} style={styles.welcome}>
          {`ようこそ${userName}さん`}
        </AppText>
      </View>

      <View accessibilityLabel={`PINを${pin.length}文字入力済み`} style={styles.dots}>
        {Array.from({ length: 4 }, (_, index) => (
          <View
            key={index}
            accessibilityLabel={index < pin.length ? '入力済み' : '未入力'}
            style={[styles.dot, index < pin.length && styles.dotFilled]}
            testID={`pin-dot-${index}`}
          />
        ))}
      </View>

      <View style={styles.spacer} />

      <View style={styles.keypad}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((value) => (
              <Pressable
                key={value}
                accessibilityLabel={
                  value === 'delete'
                    ? '1文字消す'
                    : value === 'submit'
                      ? 'PINを決定'
                      : `${value}を入力`
                }
                accessibilityRole="button"
                onPress={() => pressKey(value)}
                testID={`pin-key-${value}`}
                style={({ pressed }) => [styles.key, pressed && styles.pressed]}>
                {value === 'delete' || value === 'submit' ? (
                  <Image
                    source={value === 'delete' ? deleteIcon : submitIcon}
                    style={styles.keyIcon}
                    contentFit="fill"
                    accessible={false}
                  />
                ) : (
                  <AppText variant="title">{value}</AppText>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  welcomeSlot: {
    alignSelf: 'stretch',
    height: 25,
    marginTop: 8,
    position: 'relative',
  },
  welcome: {
    left: -20,
    lineHeight: 25,
    maxWidth: 320,
    position: 'absolute',
    textAlign: 'center',
    width: 320,
  },
  dots: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 37,
  },
  dot: {
    backgroundColor: colors.surface,
    borderColor: colors.text,
    borderRadius: radii.full,
    borderWidth: 3,
    height: 30,
    width: 30,
  },
  dotFilled: {
    backgroundColor: colors.text,
  },
  spacer: {
    alignSelf: 'center',
    height: 34,
    width: 10,
  },
  keypad: {
    alignSelf: 'center',
    gap: 23,
  },
  row: {
    flexDirection: 'row',
    gap: 30,
  },
  key: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.full,
    height: 75,
    justifyContent: 'center',
    width: 75,
  },
  keyIcon: {
    height: 45,
    width: 45,
  },
  pressed: {
    opacity: 0.7,
  },
});
