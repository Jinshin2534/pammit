import { Tabs } from 'expo-router';

import { colors, fonts } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.link,
        tabBarInactiveTintColor: colors.textSub,
        tabBarLabelStyle: { fontFamily: fonts.medium },
      }}>
      <Tabs.Screen name="index" options={{ title: 'ホーム' }} />
      <Tabs.Screen name="schedule" options={{ title: '予定' }} />
      <Tabs.Screen name="farm" options={{ title: '農園' }} />
      <Tabs.Screen name="ai" options={{ title: 'AI相談' }} />
      <Tabs.Screen name="settings" options={{ title: '設定' }} />
    </Tabs>
  );
}
