import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { Button, Card } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';

type LoginRole = 'owner' | 'worker';

export default function RoleScreen() {
  const selectRole = (role: LoginRole) => {
    router.push({ pathname: '/(auth)/user', params: { role } });
  };

  return (
    <PageLayout
      variant="centered"
      header={<ScreenHeader title="役割を選ぶ" topPadding={16} />}
      testID="role-screen">
      <View style={styles.introduction}>
        <Text maxFontSizeMultiplier={1.2} style={styles.question}>
          あなたはどちらですか？
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.guide}>
          当てはまる方を押してください
        </Text>
      </View>

      <Card
        title="師匠農家さん"
        body="農園の管理や、みんなの記録を確認する方"
        variant="filled"
        testID="role-owner-card">
        <Button
          label="師匠農家さんで進む"
          variant="secondary"
          size="lg"
          onPress={() => selectRole('owner')}
          testID="role-owner-button"
        />
      </Card>

      <Card
        title="後継者・アルバイト"
        body="農作業や予定の確認をする方"
        variant="outlined"
        testID="role-worker-card">
        <Button
          label="作業者として進む"
          variant="primary"
          size="lg"
          onPress={() => selectRole('worker')}
          testID="role-worker-button"
        />
      </Card>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  introduction: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  question: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 23,
    includeFontPadding: false,
    lineHeight: 30,
    textAlign: 'center',
  },
  guide: {
    color: colors.textSub,
    fontFamily: fonts.medium,
    fontSize: 15,
    includeFontPadding: false,
    lineHeight: 22,
    textAlign: 'center',
  },
});
