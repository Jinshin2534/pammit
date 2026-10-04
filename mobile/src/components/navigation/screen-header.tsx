import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/theme/tokens';

type BackNavigation =
  | { showBack: true; onBack: () => void }
  | { showBack?: false; onBack?: never };

export type ScreenHeaderProps = BackNavigation & {
  title: string;
  /** SafeAreaViewの内側で使う場合は16。画面全体から配置する場合は40。 */
  topPadding?: number;
  backAccessibilityLabel?: string;
  testID?: string;
};

export function ScreenHeader({
  title,
  showBack = false,
  onBack,
  topPadding = 40,
  backAccessibilityLabel = '前の画面に戻る',
  testID,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.header, { paddingTop: topPadding }]} testID={testID}>
      <Text
        accessibilityRole="header"
        maxFontSizeMultiplier={1.2}
        style={[styles.title, showBack && styles.titleWithBack]}>
        {title}
      </Text>
      {showBack && (
        <View style={[styles.backSlot, { top: topPadding }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            onPress={onBack}
            testID={testID ? `${testID}-back` : undefined}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Image
              source={require('../../../assets/icons/chevron-left.svg')}
              style={styles.backIcon}
              contentFit="fill"
              accessible={false}
            />
          </Pressable>
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
    lineHeight: 51,
    includeFontPadding: false,
    textAlign: 'center',
  },
  titleWithBack: {
    paddingHorizontal: 72,
  },
  backSlot: {
    position: 'absolute',
    left: 16,
    bottom: 24,
    justifyContent: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backIcon: {
    width: 59,
    height: 59,
  },
  pressed: {
    opacity: 0.7,
  },
});
