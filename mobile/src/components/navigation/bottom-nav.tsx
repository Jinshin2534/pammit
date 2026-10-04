import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export type BottomNavTab = 'home' | 'schedule' | 'farm' | 'ai' | 'admin';

export type BottomNavProps = {
  role: 'worker' | 'owner';
  activeTab?: BottomNavTab;
  onTabPress: (tab: BottomNavTab) => void;
  testID?: string;
};

const tabs = [
  { key: 'home', label: 'ホーム', accessibilityLabel: 'ホーム', icon: require('../../../assets/icons/home.svg') },
  { key: 'schedule', label: '予定', accessibilityLabel: '予定', icon: require('../../../assets/icons/calendar.svg') },
  { key: 'farm', label: '農園', accessibilityLabel: '農園', icon: require('../../../assets/icons/farm.svg') },
  { key: 'ai', label: '相談', accessibilityLabel: 'AI相談', icon: require('../../../assets/icons/ai.svg') },
  { key: 'admin', label: '管理', accessibilityLabel: '管理', icon: require('../../../assets/icons/admin.svg') },
] as const;

export function BottomNav({ role, activeTab, onTabPress, testID }: BottomNavProps) {
  return (
    <View style={styles.nav} testID={testID}>
      {tabs.filter((tab) => tab.key !== 'admin' || role === 'owner').map((tab) => (
        <Pressable
          key={tab.key}
          accessibilityRole="tab"
          accessibilityLabel={tab.accessibilityLabel}
          accessibilityState={{ selected: activeTab === tab.key }}
          onPress={() => onTabPress(tab.key)}
          testID={testID ? `${testID}-${tab.key}` : undefined}
          style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
          <Image
            source={tab.icon}
            style={[styles.icon, tab.key === 'ai' && styles.aiIcon]}
            contentFit="fill"
            accessible={false}
          />
          <Text maxFontSizeMultiplier={1.2} style={styles.label}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { width: '100%', height: 62, flexDirection: 'row', paddingHorizontal: 8 },
  tab: { flex: 1, minWidth: 0, height: 62, alignItems: 'center' },
  icon: { width: 49, height: 49, marginBottom: -2 },
  aiIcon: { width: 37 },
  label: {
    color: colors.primary,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 18,
    includeFontPadding: false,
    textAlign: 'center',
  },
  pressed: { opacity: 0.7 },
});
