import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';
import { TypographyVariant } from '@/theme/typography';

const samples: { variant: TypographyVariant; label: string; sample: string }[] = [
  { variant: 'display', label: 'display', sample: '作業中' },
  { variant: 'titleLg', label: 'title/lg', sample: '大きなタイトル' },
  { variant: 'title', label: 'title', sample: '画面タイトル' },
  { variant: 'bodyLg', label: 'body/lg', sample: 'ボタン・入力欄' },
  { variant: 'bodyLgBold', label: 'body/lg-bold', sample: 'カードタイトル' },
  { variant: 'bodyMd', label: 'body/md', sample: '今日のひとこと' },
  { variant: 'body', label: 'body', sample: '本文と補足の文章' },
  { variant: 'bodyBold', label: 'body-bold', sample: '小さい強調' },
  { variant: 'caption', label: 'caption', sample: '小さい説明' },
  { variant: 'captionBold', label: 'caption-bold', sample: '小さい説明の強調' },
  { variant: 'small', label: 'small', sample: '場所・担当' },
  { variant: 'numberXl', label: 'number/xl', sample: '12' },
  { variant: 'numberLg', label: 'number/lg', sample: '35' },
];

export default function TypographyPreview() {
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <PageLayout
      header={<ScreenHeader title="文字スタイル" topPadding={16} />}
      testID="typography-preview">
      {samples.map(({ variant, label, sample }) => (
        <View key={variant} style={styles.sample} testID={`typography-${variant}`}>
          <AppText variant="caption" style={styles.label}>
            {label}
          </AppText>
          <AppText variant={variant}>{sample}</AppText>
        </View>
      ))}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  sample: {
    borderColor: colors.disabled,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  label: {
    color: colors.textSub,
  },
});
