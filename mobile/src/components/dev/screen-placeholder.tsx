import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, spacing } from '@/theme/tokens';

type ScreenPlaceholderProps = {
  title: string;
  description?: string;
};

export function ScreenPlaceholder({ title, description = '画面の実装準備ができています' }: ScreenPlaceholderProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text maxFontSizeMultiplier={1.2} style={styles.title}>
          {title}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.description}>
          {description}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.gap,
    paddingHorizontal: spacing.pageX,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 28,
    includeFontPadding: false,
    textAlign: 'center',
  },
  description: {
    color: colors.textSub,
    fontFamily: fonts.medium,
    fontSize: 16,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
