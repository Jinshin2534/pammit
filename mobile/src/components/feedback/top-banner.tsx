import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

import { Banner, BannerProps } from './banner';

/** 画面の一番上に出す赤いバナー。ステータスバーの下から始める */
export function TopBanner(props: BannerProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <Banner {...props} />
    </View>
  );
}

/**
 * TopBanner の下に ScreenHeader を置くときの topPadding。
 * ScreenHeader はステータスバーの分を足すので、バナーで下げた分を差し引いて16にそろえる。
 */
export function useHeaderPaddingBelowBanner() {
  const insets = useSafeAreaInsets();
  return Math.max(0, 16 - Math.max(0, insets.top - 24));
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.cta, width: '100%' },
});
