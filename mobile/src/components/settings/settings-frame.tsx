import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBackground } from '@/components/background/header-background';
import { TopBanner } from '@/components/feedback/top-banner';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav, BottomNavTab } from '@/components/navigation/bottom-nav';
import { AppText, Button } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';
import { useCurrentUser } from '@/providers/auth';

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
  saveDisabled?: boolean;
  saved?: boolean;
  contentStyle?: ViewStyle;
  /** 保存できなかったときなど。画面上部の赤いバナーに出す */
  errorMessage?: string | null;
  testID: string;
};

export function SettingsFrame({ children, onSave, saveDisabled = false, saved = false, contentStyle, errorMessage, testID }: SettingsFrameProps) {
  return (
    <PageLayout
      background={<HeaderBackground position="center" />}
      header={
        <View>
          {errorMessage ? <TopBanner kind="network" message={errorMessage} testID={`${testID}-error`} /> : null}
          <SettingsTopBar />
        </View>
      }
      footer={<SettingsFooter onSave={onSave} saveDisabled={saveDisabled} saved={saved} />}
      variant="centered"
      scrollable={false}
      testID={testID}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </PageLayout>
  );
}

function SettingsTopBar() {
  // ScreenHeaderと同じく、ステータスバーが24より高い分だけ下げる
  const topOffset = Math.max(0, useSafeAreaInsets().top - 24);
  return (
    <View style={[styles.topBar, { height: 91 + topOffset, paddingTop: 40 + topOffset }]}>
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

function SettingsFooter({ onSave, saveDisabled, saved }: Pick<SettingsFrameProps, 'onSave' | 'saveDisabled' | 'saved'>) {
  const role = useCurrentUser()?.role ?? 'worker';
  return (
    <View style={[styles.footer, onSave && styles.footerWithSave]}>
      {onSave && (
        <Button label="保存" variant="cta" size="md" disabled={saveDisabled} onPress={onSave} style={styles.saveButton} testID="settings-save" />
      )}
      <BottomNav role={role} onTabPress={(tab) => router.navigate(routes[tab])} testID="settings-bottom-nav" />
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
