import { Text, TextProps } from 'react-native';

import { colors } from '@/theme/tokens';
import { typography, TypographyVariant } from '@/theme/typography';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
};

export function AppText({ variant = 'body', style, ...props }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.2}
      {...props}
      style={[{ color: colors.text, includeFontPadding: false }, typography[variant], style]}
    />
  );
}
