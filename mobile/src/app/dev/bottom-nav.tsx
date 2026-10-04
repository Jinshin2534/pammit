import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav, BottomNavTab } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { colors, fonts, radii } from '@/theme/tokens';

const titles: Record<BottomNavTab, string> = {
  home: 'ホーム', schedule: '予定', farm: '農園', ai: 'AI相談', admin: '管理',
};

export default function BottomNavPreview() {
  const { role: initialRole } = useLocalSearchParams<{ role?: string }>();
  const [role, setRole] = useState<'worker' | 'owner'>(initialRole === 'owner' ? 'owner' : 'worker');
  const [tab, setTab] = useState<BottomNavTab>('home');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <PageLayout
      testID="bottom-nav-preview-ready"
      header={<ScreenHeader title={titles[tab]} topPadding={16} />}
      footer={<BottomNav role={role} activeTab={tab} onTabPress={setTab} testID="bottom-nav" />}>
      <Text style={styles.text}>下のタブを押すと、選んだ画面のタイトルを表示します。</Text>
      <View style={styles.roles}>
        {(['worker', 'owner'] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: role === value }}
            testID={`bottom-nav-role-${value}`}
            onPress={() => {
              setRole(value);
              if (value === 'worker' && tab === 'admin') setTab('home');
            }}
            style={styles.role}>
            <Text style={styles.text}>{value === 'worker' ? '作業者：4タブ' : '管理者：5タブ'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.text} testID="bottom-nav-selection">選んだタブ：{titles[tab]}</Text>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 18, includeFontPadding: false },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  role: { borderWidth: 1, borderColor: colors.primary, borderRadius: radii.md, padding: 12 },
});
