import { ReactNode } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBackground } from '@/components/background/header-background';
import { BottomNav, BottomNavTab } from '@/components/navigation/bottom-nav';
import { Button, Dropdown, DropdownOption, IconButton, TextField } from '@/components/ui';
import { colors, fonts, radii, strokes } from '@/theme/tokens';

type AdminPageProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  bottomNav?: boolean;
  contentStyle?: ViewStyle;
  scrollable?: boolean;
  testID?: string;
};

export function AdminPage({ children, header, footer, bottomNav = false, contentStyle, scrollable = false, testID }: AdminPageProps) {
  const content = <View style={[styles.content, contentStyle]}>{children}</View>;

  return (
    <View style={[styles.page, bottomNav && styles.pageWithNav]} testID={testID}>
      <HeaderBackground position="top" />
      <SafeAreaView style={styles.safeArea}>
        {header}
        {scrollable ? (
          <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : <View style={styles.body}>{content}</View>}
        {footer}
        {bottomNav ? <AdminBottomNav /> : null}
      </SafeAreaView>
    </View>
  );
}

export function AdminHeader({ title, showBack = false, onBack = () => router.back(), compact = false }: { title: string; showBack?: boolean; onBack?: () => void; compact?: boolean }) {
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.title}>{title}</Text>
      {showBack ? <View style={styles.headerBack}><AdminIconButton onPress={onBack} /></View> : null}
    </View>
  );
}

export function AdminIconButton({ onPress, direction = 'back' }: { onPress: () => void; direction?: 'back' | 'forward' }) {
  return (
    <IconButton
      accessibilityLabel={direction === 'back' ? '戻る' : '次へ'}
      icon={<Image source={require('../../../assets/icons/chevron-left.svg')} style={[styles.backIcon, direction === 'forward' && styles.forwardIcon]} contentFit="fill" accessible={false} />}
      onPress={onPress}
      style={styles.iconButton}
    />
  );
}

export function AdminButton({ label, onPress, variant = 'primary', size = 'md', fullWidth = false }: { label: string; onPress: () => void; variant?: 'primary' | 'cta'; size?: 'md' | 'lg'; fullWidth?: boolean }) {
  return <Button label={label} onPress={onPress} variant={variant} size={size} style={fullWidth ? styles.fullWidth : styles.adminButton} />;
}

export function AdminFlowFooter({ onBack, onNext, nextLabel = '確認する', nextVariant = 'primary', backOnly = false }: { onBack: () => void; onNext?: () => void; nextLabel?: string; nextVariant?: 'primary' | 'cta'; backOnly?: boolean }) {
  return (
    <View style={styles.footer}>
      <View style={styles.footerRow}>
        <AdminIconButton onPress={onBack} />
        {!backOnly && onNext ? <AdminButton label={nextLabel} onPress={onNext} variant={nextVariant} /> : null}
      </View>
    </View>
  );
}

export function AdminTextField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return <TextField label={label} value={value} onChangeText={onChangeText} />;
}

export function AdminDropdown({ label, value, options, onChange }: { label: string; value: string; options: readonly DropdownOption[]; onChange: (value: string) => void }) {
  return <Dropdown label={label} value={[value]} options={options} onChange={(next) => next[0] && onChange(next[0])} />;
}

export function AdminMenuTile({ label, image, onPress }: { label: string; image: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuTile, pressed && styles.pressed]}>
      <Text maxFontSizeMultiplier={1.2} style={styles.menuLabel}>{label}</Text>
      <Image source={image} style={styles.menuImage} contentFit="cover" accessible={false} />
    </Pressable>
  );
}

export function AdminBottomNav() {
  const onTabPress = (tab: BottomNavTab) => {
    const routes = {
      home: '/(tabs)',
      schedule: '/(tabs)/schedule',
      farm: '/(tabs)/farm',
      ai: '/(tabs)/ai',
      admin: '/admin',
    } as const;
    router.replace(routes[tab]);
  };

  return <BottomNav role="owner" activeTab="admin" onTabPress={onTabPress} />;
}

export const adminTextStyles = StyleSheet.create({
  bodyLg: { color: colors.text, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 25 },
  bodyLgBold: { color: colors.text, fontFamily: fonts.bold, fontSize: 23, includeFontPadding: false, lineHeight: 25 },
  body: { color: colors.text, fontFamily: fonts.medium, fontSize: 15, includeFontPadding: false, lineHeight: 15 },
  caption: { color: colors.textSub, fontFamily: fonts.medium, fontSize: 13, includeFontPadding: false, lineHeight: 13 },
  small: { color: colors.text, fontFamily: fonts.medium, fontSize: 10, includeFontPadding: false, lineHeight: 10 },
});

const styles = StyleSheet.create({
  page: { alignSelf: 'center', backgroundColor: colors.surface, flex: 1, maxWidth: Platform.OS === 'web' ? 360 : undefined, width: '100%' },
  pageWithNav: { paddingBottom: 10 },
  safeArea: { flex: 1 },
  body: { flex: 1, minHeight: 0 },
  content: { alignItems: 'center', flex: 1, gap: 20, overflow: 'hidden', paddingBottom: 24, paddingHorizontal: 40, paddingTop: 8 },
  scrollContent: { flexGrow: 1 },
  header: { alignItems: 'center', justifyContent: 'center', paddingBottom: 30, paddingHorizontal: 40, paddingTop: 40, position: 'relative', width: '100%' },
  headerCompact: { paddingBottom: 10 },
  headerBack: { left: 16, position: 'absolute', top: 47 },
  title: { color: colors.text, fontFamily: fonts.medium, fontSize: 35, includeFontPadding: false, lineHeight: 45, textAlign: 'center' },
  iconButton: { overflow: 'hidden' },
  backIcon: { height: 59, width: 59 },
  forwardIcon: { transform: [{ rotate: '180deg' }] },
  adminButton: { minWidth: 152, paddingHorizontal: 20, width: 'auto' },
  fullWidth: { width: '100%' },
  footer: { paddingBottom: 32, paddingHorizontal: 40, paddingTop: 12, width: '100%' },
  footerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  fieldGroup: { alignSelf: 'stretch', gap: 8 },
  bodyLg: { color: colors.text, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 25 },
  dropdown: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 20 },
  chevron: { height: 10, transform: [{ rotate: '180deg' }], width: 14 },
  menuTile: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, gap: 4, overflow: 'hidden', paddingTop: 8, width: 167 },
  menuLabel: { color: colors.textInverse, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 25 },
  menuImage: { height: 103, width: 103 },
  pressed: { opacity: 0.7 },
});
