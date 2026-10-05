import { ReactNode } from 'react';
import { Image } from 'expo-image';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBackground } from '@/components/background/header-background';
import { colors, fonts, radii, spacing, strokes } from '@/theme/tokens';

type WorkPageProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  backgroundPosition?: 'top' | 'center';
  contentStyle?: ViewStyle;
  scrollable?: boolean;
  testID?: string;
};

export function WorkPage({ children, header, footer, backgroundPosition = 'top', contentStyle, scrollable = false, testID }: WorkPageProps) {
  const content = <View style={[styles.content, scrollable && styles.scrollPageContent, contentStyle]}>{children}</View>;

  return (
    <View style={styles.page} testID={testID}>
      <HeaderBackground position={backgroundPosition} />
      <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
        {header}
        {scrollable ? (
          <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : <View style={styles.body}>{content}</View>}
        {footer}
      </SafeAreaView>
    </View>
  );
}

/** Figmaの上余白はステータスバー24を含む。ScreenHeaderと同じく、それより高い分だけ下げる。 */
export function useStatusBarOffset() {
  const insets = useSafeAreaInsets();
  return Math.max(0, insets.top - 24);
}

export function WorkTitleHeader({ title }: { title: string }) {
  const topOffset = useStatusBarOffset();
  return (
    <View style={[styles.titleHeader, { paddingTop: 40 + topOffset }]}>
      <Text maxFontSizeMultiplier={1.2} style={styles.title}>{title}</Text>
    </View>
  );
}

export function WorkStepHeader({ current, title, total = 4 }: { current: number; title: string; total?: number }) {
  const topOffset = useStatusBarOffset();
  return (
    <View style={[styles.stepHeader, { paddingTop: 40 + topOffset }]}>
      <View style={[styles.steps, total === 5 && styles.stepsFive]}>
        <View style={styles.stepLine} />
        {Array.from({ length: total }, (_, index) => index + 1).map((number) => (
          <View key={number} style={[styles.stepDot, number === current && styles.currentStep]}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.stepNumber, number === current && styles.currentStepNumber]}>{number}</Text>
          </View>
        ))}
      </View>
      <Text maxFontSizeMultiplier={1.2} style={styles.bodyLg}>{title}</Text>
    </View>
  );
}

export function WorkBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="前の画面に戻る" accessibilityRole="button" hitSlop={8} onPress={onPress} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
      <Image source={require('../../../assets/icons/chevron-left.svg')} style={styles.backIcon} contentFit="fill" accessible={false} />
    </Pressable>
  );
}

export function WorkButton({ label, onPress, onLongPress, accessibilityHint, variant = 'primary', disabled = false, style }: { label: string; onPress: () => void; onLongPress?: () => void; accessibilityHint?: string; variant?: 'primary' | 'cta'; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable accessibilityHint={accessibilityHint} accessibilityRole="button" accessibilityState={{ disabled }} delayLongPress={800} disabled={disabled} onLongPress={onLongPress} onPress={onPress} style={({ pressed }) => [styles.button, variant === 'cta' && styles.ctaButton, disabled && styles.disabledButton, pressed && styles.pressed, style]}>
      <Text maxFontSizeMultiplier={1.2} style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function WorkFlowFooter({ onBack, onNext, nextLabel = '次へ', nextVariant = 'primary', status, nextDisabled = false }: { onBack: () => void; onNext: () => void; nextLabel?: string; nextVariant?: 'primary' | 'cta'; status?: string; nextDisabled?: boolean }) {
  return (
    <View style={styles.flowFooter}>
      {status ? <Text maxFontSizeMultiplier={1.2} style={styles.status}>{status}</Text> : null}
      <View style={styles.flowRow}>
        <WorkBackButton onPress={onBack} />
        <WorkButton label={nextLabel} onPress={onNext} variant={nextVariant} disabled={nextDisabled} />
      </View>
    </View>
  );
}

export function WorkChoice({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ selected }} disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.selectedChoice, pressed && styles.pressed]}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.bodyLg, selected && styles.selectedChoiceText]}>{label}</Text>
    </Pressable>
  );
}

export function WorkDisplayField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldGroup}>
      <Text maxFontSizeMultiplier={1.2} style={styles.bodyLg}>{label}</Text>
      <View style={styles.field}>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.bodyLg}>{value}</Text>
      </View>
    </View>
  );
}

export function ActiveWorkHeader({ plot, work, compact = false }: { plot: string; work: string; compact?: boolean }) {
  const topOffset = useStatusBarOffset();
  return (
    <View style={[styles.activeHeader, { paddingTop: (compact ? 16 : 40) + topOffset }]}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.bodyLg}>{plot}　{work}</Text>
      <Text maxFontSizeMultiplier={1.2} style={styles.display}>作業中</Text>
    </View>
  );
}

export function WorkCounts() {
  const values = [['75', '切る'], ['56', '残す'], ['2', '判断不可']] as const;
  return (
    <View style={styles.counts}>
      {values.map(([value, label], index) => (
        <View key={label} style={styles.countGroup}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.countCopy}>
            <Text maxFontSizeMultiplier={1.2} style={styles.number}>{value}</Text>
            <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.bodyMd}>{label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export const workTextStyles = StyleSheet.create({
  title: { color: colors.text, fontFamily: fonts.medium, fontSize: 35, includeFontPadding: false, lineHeight: 42, textAlign: 'center' },
  bodyLg: { color: colors.text, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 28 },
  body: { color: colors.text, fontFamily: fonts.medium, fontSize: 15, includeFontPadding: false, lineHeight: 18 },
  caption: { color: colors.text, fontFamily: fonts.medium, fontSize: 13, includeFontPadding: false, lineHeight: 16 },
  small: { color: colors.text, fontFamily: fonts.medium, fontSize: 10, includeFontPadding: false, lineHeight: 12 },
  bodyLgBold: { color: colors.text, fontFamily: fonts.bold, fontSize: 23, includeFontPadding: false, lineHeight: 28 },
});

const styles = StyleSheet.create({
  page: { alignSelf: 'center', backgroundColor: colors.surface, flex: 1, maxWidth: Platform.OS === 'web' ? 360 : undefined, width: '100%' },
  safeArea: { flex: 1 },
  body: { flex: 1, minHeight: 0 },
  content: { alignItems: 'center', flexGrow: 1, gap: spacing.gap, overflow: 'hidden', paddingBottom: 24, paddingHorizontal: spacing.pageX, paddingTop: 8 },
  scrollPageContent: { flexShrink: 0, overflow: 'visible' },
  scrollContent: { flexGrow: 1 },
  titleHeader: { alignItems: 'center', paddingBottom: 26, paddingHorizontal: spacing.pageX, paddingTop: 40, width: '100%' },
  title: { color: colors.text, fontFamily: fonts.medium, fontSize: 35, includeFontPadding: false, lineHeight: 42, textAlign: 'center' },
  stepHeader: { alignItems: 'center', gap: 38, paddingBottom: 21, paddingTop: 40, width: '100%' },
  steps: { alignItems: 'center', flexDirection: 'row', gap: 42, justifyContent: 'center', position: 'relative', width: 295 },
  stepsFive: { gap: 21 },
  stepLine: { backgroundColor: colors.disabled, height: 3, left: 21, position: 'absolute', right: 21, top: 20 },
  stepDot: { alignItems: 'center', backgroundColor: colors.disabled, borderRadius: radii.full, height: 42, justifyContent: 'center', width: 42 },
  currentStep: { backgroundColor: colors.accent },
  stepNumber: { color: colors.text, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 28, textAlign: 'center' },
  currentStepNumber: { color: colors.textInverse },
  bodyLg: { color: colors.text, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 28 },
  bodyMd: { color: colors.text, fontFamily: fonts.medium, fontSize: 20, includeFontPadding: false, lineHeight: 25, textAlign: 'center' },
  backButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.full, height: 48, justifyContent: 'center', overflow: 'hidden', width: 48 },
  backIcon: { height: 59, width: 59 },
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.full, height: 48, justifyContent: 'center', width: 152 },
  ctaButton: { backgroundColor: colors.cta },
  disabledButton: { backgroundColor: colors.disabled },
  buttonText: { color: colors.textInverse, fontFamily: fonts.medium, fontSize: 23, includeFontPadding: false, lineHeight: 28, textAlign: 'center' },
  flowFooter: { gap: 8, paddingBottom: 32, paddingHorizontal: spacing.pageX, paddingTop: 12, width: '100%' },
  flowRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  status: { alignSelf: 'stretch', color: colors.primary, fontFamily: fonts.medium, fontSize: 15, includeFontPadding: false, lineHeight: 18, textAlign: 'right' },
  choice: { alignItems: 'flex-start', alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, height: 58, justifyContent: 'center', paddingHorizontal: 20 },
  selectedChoice: { backgroundColor: colors.accent },
  selectedChoiceText: { color: colors.textInverse },
  fieldGroup: { alignSelf: 'stretch', gap: 8 },
  field: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, flexDirection: 'row', height: 58, paddingHorizontal: 20 },
  activeHeader: { alignItems: 'center', gap: 4, paddingBottom: 5, paddingTop: 40, width: '100%' },
  display: { color: colors.text, fontFamily: fonts.bold, fontSize: 55, includeFontPadding: false, lineHeight: 67, textAlign: 'center' },
  counts: { alignItems: 'center', flexDirection: 'row', height: 106, justifyContent: 'space-between', width: '100%' },
  countGroup: { alignItems: 'center', flexDirection: 'row', height: '100%' },
  countCopy: { alignItems: 'center', gap: 9, width: 92 },
  divider: { backgroundColor: colors.text, height: 64, marginHorizontal: 1, width: 2 },
  number: { color: colors.text, fontFamily: fonts.medium, fontSize: 60, includeFontPadding: false, lineHeight: 72, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
