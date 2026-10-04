import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav, BottomNavTab } from '@/components/navigation/bottom-nav';
import { AppText, Button } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';
import { useAppState } from '@/providers/app-state';

const routes: Record<BottomNavTab, '/(tabs)' | '/(tabs)/schedule' | '/(tabs)/farm' | '/(tabs)/ai' | '/admin'> = {
  home: '/(tabs)',
  schedule: '/(tabs)/schedule',
  farm: '/(tabs)/farm',
  ai: '/(tabs)/ai',
  admin: '/admin',
};

export type SettingsFrameProps = {
  children: ReactNode;
  onSave?: () => void;
  saved?: boolean;
  contentStyle?: ViewStyle;
  testID: string;
};

export function SettingsFrame({ children, onSave, saved = false, contentStyle, testID }: SettingsFrameProps) {
  return (
    <PageLayout
      background={<HeaderBackground position="center" />}
      header={<SettingsTopBar />}
      footer={<SettingsFooter onSave={onSave} saved={saved} />}
      variant="centered"
      scrollable={false}
      testID={testID}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </PageLayout>
  );
}

function SettingsTopBar() {
  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityLabel="前の画面に戻る"
        accessibilityRole="button"
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <Image
          source={require('../../../assets/icons/chevron-left.svg')}
          style={styles.backIcon}
          contentFit="fill"
          accessible={false}
        />
      </Pressable>
    </View>
  );
}

function SettingsFooter({ onSave, saved }: Pick<SettingsFrameProps, 'onSave' | 'saved'>) {
  const { session } = useAppState();
  return (
    <View style={[styles.footer, onSave && styles.footerWithSave]}>
      {onSave && (
        <Button label="保存" variant="cta" size="md" onPress={onSave} style={styles.saveButton} testID="settings-save" />
      )}
      <BottomNav role={session.role} onTabPress={(tab) => router.navigate(routes[tab])} testID="settings-bottom-nav" />
      {saved && (
        <View accessibilityRole="alert" style={styles.toast} testID="settings-saved-toast">
          <AppText variant="bodyBold" style={styles.toastText}>保存しました</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 91,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  backIcon: {
    height: 59,
    width: 59,
  },
  content: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 20,
    transform: [{ translateY: -4 }],
  },
  footer: {
    alignItems: 'center',
    position: 'relative',
  },
  footerWithSave: {
    gap: 16,
  },
  saveButton: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    width: 80,
  },
  toast: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    justifyContent: 'center',
    left: 111,
    minHeight: 49,
    paddingHorizontal: 24,
    paddingVertical: 12,
    position: 'absolute',
    top: -55,
  },
  toastText: {
    color: colors.textInverse,
    lineHeight: 25,
  },
  pressed: {
    opacity: 0.7,
  },
});
