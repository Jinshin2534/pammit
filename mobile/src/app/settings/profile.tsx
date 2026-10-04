import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SettingsFrame } from '@/components/settings/settings-frame';
import { AppText, Button, TextField } from '@/components/ui';
import { colors } from '@/theme/tokens';

const mascot = require('../../../assets/images/empty-schedule-character-2.png');

export default function ProfileScreen() {
  const [name, setName] = useState('巣立 好喜子');

  return (
    <SettingsFrame testID="profile-screen">
      <AppText variant="title" style={styles.title}>プロフィール</AppText>
      <TextField label="名前" value={name} onChangeText={setName} testID="profile-name" />
      <View style={styles.iconField}>
        <AppText variant="bodyLg" style={styles.iconLabel}>アイコン</AppText>
        <View style={styles.iconFrame}>
          <View style={styles.iconInset} />
          <Image source={mascot} style={styles.mascot} contentFit="fill" accessible={false} />
        </View>
        <Button label="変更する" variant="primary" size="md" onPress={() => undefined} testID="profile-change-icon" />
      </View>
    </SettingsFrame>
  );
}

const styles = StyleSheet.create({
  title: {
    lineHeight: 51,
    textAlign: 'center',
  },
  iconField: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 8,
  },
  iconLabel: {
    alignSelf: 'stretch',
    lineHeight: 25,
  },
  iconFrame: {
    backgroundColor: colors.primary,
    height: 162,
    position: 'relative',
    width: 229,
  },
  iconInset: {
    backgroundColor: colors.surfaceMuted,
    height: 146,
    left: 9,
    position: 'absolute',
    top: 8,
    width: 211,
  },
  mascot: {
    height: 125,
    left: 19,
    position: 'absolute',
    top: 18,
    width: 185,
  },
});
