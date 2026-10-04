import { StyleSheet, Text, TextStyle, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { colors, fonts, spacing } from '@/theme/tokens';

type BackNavigation =
  | { showBack: true; onBack: () => void }
  | { showBack?: false; onBack?: never };

export type ScreenHeaderProps = BackNavigation & {
  title: string;
  /** 通常は40。バナー直下など、画面固有の縮小が必要な場合だけ上書きする。 */
  topPadding?: number;
  backAccessibilityLabel?: string;
  testID?: string;
  titleStyle?: TextStyle;
};

export function ScreenHeader({
  title,
  showBack = false,
  onBack,
  topPadding = 40,
  backAccessibilityLabel = '前の画面に戻る',
  testID,
  titleStyle,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const safeOffset = Math.max(0, insets.top - 24);

  return (
    <View
      style={[styles.header, { height: 115 + safeOffset, paddingTop: topPadding + safeOffset }]}
      testID={testID}>
      <Text
        accessibilityRole="header"
        maxFontSizeMultiplier={1.2}
        style={[styles.title, showBack && styles.titleWithBack, titleStyle]}>
        {title}
      </Text>
      {showBack && (
        <View style={[styles.backSlot, { top: 41.5 + safeOffset }]}>
          <IconButton
            accessibilityLabel={backAccessibilityLabel}
            icon="back"
            onPress={() => onBack?.()}
            testID={testID ? `${testID}-back` : undefined}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    paddingBottom: 24,
  },
  title: {
    paddingHorizontal: spacing.pageX,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 35,
    lineHeight: 42,
    includeFontPadding: false,
    textAlign: 'center',
  },
  titleWithBack: {},
  backSlot: {
    position: 'absolute',
    left: 16,
    justifyContent: 'center',
  },
});
