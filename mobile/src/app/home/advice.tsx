import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav, BottomNavTab } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText } from '@/components/ui';
import { colors, radii, strokes } from '@/theme/tokens';
import { useAppState } from '@/providers/app-state';

const routes: Record<BottomNavTab, '/(tabs)' | '/(tabs)/schedule' | '/(tabs)/farm' | '/(tabs)/ai' | '/admin'> = {
  home: '/(tabs)',
  schedule: '/(tabs)/schedule',
  farm: '/(tabs)/farm',
  ai: '/(tabs)/ai',
  admin: '/admin',
};

const hill = require('../../../assets/figma/auth-home/advice-02.svg');
const robot = require('../../../assets/figma/auth-home/robot-advice-2.png');

export default function HomeAdviceScreen() {
  const { userName: userNameParam } = useLocalSearchParams<{
    role?: string;
    userName?: string;
  }>();
  const { session } = useAppState();
  const role = session.role;
  const userName = userNameParam ?? session.userName;

  const navigateTab = (tab: BottomNavTab) => {
    router.navigate({ pathname: routes[tab], params: { role, userName } });
  };

  return (
    <PageLayout
      background={
        <>
          <HeaderBackground position="top" testID="advice-background-glow" />
          <Image source={hill} style={styles.hill} contentFit="fill" accessible={false} />
        </>
      }
      header={<ScreenHeader title="今日のひとことAI" showBack onBack={() => router.back()} titleStyle={styles.title} />}
      footer={<BottomNav role={role} activeTab="home" onTabPress={navigateTab} />}
      scrollable={false}
      testID="home-advice-screen">
      <Image source={robot} style={styles.robot} contentFit="contain" accessible={false} />

      <View style={styles.summaryCard}>
        <AppText style={styles.cardText}>
          高温になる前に摘果。実が密集している木から先に切るのがおすすめです。
        </AppText>
      </View>

      <View style={styles.detailCard}>
        <AppText style={styles.cardText}>
          {'日中の気温が上がると、作業する人の負担も大きくなります。午前中など比較的涼しい時間帯に、実が密集している木から確認してみましょう。込み合った部分を先に見ることで、残す実を見比べやすくなり、作業の優先順位も立てやすくなります。\n※最終的な摘果の基準や順番は、農園の状態・栽培方針に合わせて経験者の判断を優先してください。'}
        </AppText>
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  hill: {
    height: 114,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 258,
    transform: [{ scaleY: -1 }],
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    paddingHorizontal: 64,
  },
  robot: {
    alignSelf: 'center',
    height: 214,
    width: 214,
  },
  summaryCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radii.md,
    borderWidth: strokes.default,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceGray,
    borderRadius: radii.md,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 15,
  },
});
