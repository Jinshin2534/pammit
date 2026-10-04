import { ReactNode } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBackground } from '@/components/background/header-background';
import { BottomNav, BottomNavTab } from '@/components/navigation/bottom-nav';
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
    <Pressable accessibilityRole="button" accessibilityLabel={direction === 'back' ? '戻る' : '次へ'} hitSlop={8} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Image source={require('../../../assets/icons/chevron-left.svg')} style={[styles.backIcon, direction === 'forward' && styles.forwardIcon]} contentFit="fill" accessible={false} />
    </Pressable>
  );
}

export function AdminButton({ label, onPress, variant = 'primary', size = 'md', fullWidth = false }: { label: string; onPress: () => void; variant?: 'primary' | 'cta'; size?: 'md' | 'lg'; fullWidth?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, variant === 'cta' && styles.ctaButton, size === 'lg' && styles.largeButton, fullWidth && styles.fullWidth, pressed && styles.pressed]}>
      <Text maxFontSizeMultiplier={1.2} style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
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
  return (
    <View style={styles.fieldGroup}>
      <Text maxFontSizeMultiplier={1.2} style={styles.bodyLg}>{label}</Text>
      <TextInput maxFontSizeMultiplier={1.2} value={value} onChangeText={onChangeText} style={styles.textInput} />
    </View>
  );
}

export function AdminDropdown({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={styles.fieldGroup}>
      <Text maxFontSizeMultiplier={1.2} style={styles.bodyLg}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.dropdown, pressed && styles.pressed]}>
        <Text maxFontSizeMultiplier={1.2} style={styles.bodyLg}>{value}</Text>
        <Image source={require('../../../assets/images/admin/dropdown-chevron.svg')} style={styles.chevron} contentFit="fill" accessible={false} />
      </Pressable>
    </View>
  );
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
  page: { alignSelf: 'center', backgroundColor: colors.surface, flex: 1, maxWidth: 360, width: '100%' },
  pageWithNav: { paddingBottom: 10 },
  safeArea: { flex: 1 },
  body: { flex: 1, minHeight: 0 },
  content: { alignItems: 'center', flex: 1, gap: 20, overflow: 'hidden', paddingBottom: 24, paddingHorizontal: 40, paddingTop: 8 },
  scrollContent: { flexGrow: 1 },
  header: { alignItems: 'center', justifyContent: 'center', paddingBottom: 24, paddingHorizontal: 40, paddingTop: 40, position: 'relative', width: '100%' },
  headerCompact: { paddingBottom: 4 },
  headerBack: { left: 16, position: 'absolute', top: 47 },
  title: { color: colors.text, fontFamily: fonts.medium, fontSize: 35, includeFontPadding: false, lineHeight: 45, textAlign: 'center' },
  iconButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.full, height: 48, justifyContent: 'center', overflow: 'hidden', width: 48 },
  backIcon: { height: 59, width: 59 },
  forwardIcon: { transform: [{ rotate: '180deg' }] },
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.full, height: 48, justifyContent: 'center', paddingHorizontal: 24, width: 152 },
  ctaButton: { backgroundColor: colors.cta },
  largeButton: { height: 58 },
  fullWidth: { width: '100%' },
  buttonText: { color: colors.textInverse, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 25, textAlign: 'center' },
  footer: { paddingBottom: 32, paddingHorizontal: 40, paddingTop: 12, width: '100%' },
  footerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  fieldGroup: { alignSelf: 'stretch', gap: 8 },
  bodyLg: { color: colors.text, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 25 },
  textInput: { alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, color: colors.text, fontFamily: fonts.medium, fontSize: 23, height: 58, includeFontPadding: false, lineHeight: 25, paddingHorizontal: 20, paddingVertical: 0 },
  dropdown: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 20 },
  chevron: { height: 10, transform: [{ rotate: '180deg' }], width: 14 },
  menuTile: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, gap: 4, overflow: 'hidden', paddingTop: 8, width: 167 },
  menuLabel: { color: colors.textInverse, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 25 },
  menuImage: { height: 96, width: 96 },
  pressed: { opacity: 0.7 },
});
