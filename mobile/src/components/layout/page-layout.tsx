import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

export type PageLayoutProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  background?: ReactNode;
  variant?: 'standard' | 'centered';
  /** カレンダー・農園・AI相談では16。既定は40。 */
  contentPadding?: number;
  /** 本文側が独自のリストやスクロールを持つ場合はfalse。 */
  scrollable?: boolean;
  testID?: string;
};

export function PageLayout({
  children,
  header,
  footer,
  background,
  variant = 'standard',
  contentPadding = spacing.pageX,
  scrollable = true,
  testID,
}: PageLayoutProps) {
  const contentStyle = [
    styles.content,
    { paddingHorizontal: contentPadding },
    variant === 'centered' && styles.centered,
  ];

  return (
    <View style={styles.page} testID={testID}>
      <View style={styles.canvas}>
        {background != null && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {background}
          </View>
        )}
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.safeArea}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {header != null && <View style={styles.fixed}>{header}</View>}
            {scrollable ? (
              <ScrollView
                style={styles.body}
                contentContainerStyle={contentStyle}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentInsetAdjustmentBehavior="never"
                testID={testID ? `${testID}-body` : undefined}>
                {children}
              </ScrollView>
            ) : (
              <View
                style={[styles.body, contentStyle]}
                testID={testID ? `${testID}-body` : undefined}>
                {children}
              </View>
            )}
            {footer != null && (
              <View style={[styles.fixed, styles.footer]} testID={testID ? `${testID}-footer` : undefined}>
                {footer}
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', flex: 1, backgroundColor: colors.surface },
  canvas: { backgroundColor: colors.surface, flex: 1, maxWidth: Platform.OS === 'web' ? 360 : undefined, width: '100%' },
  safeArea: { flex: 1 },
  fixed: { flexShrink: 0 },
  body: { flex: 1, minHeight: 0 },
  content: {
    flexGrow: 1,
    gap: spacing.gap,
    paddingTop: 8,
    paddingBottom: 24,
  },
  centered: { justifyContent: 'center' },
  footer: { paddingBottom: 10 },
});
