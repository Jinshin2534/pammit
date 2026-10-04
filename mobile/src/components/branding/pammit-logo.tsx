import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

export type PammitLogoProps = { compact?: boolean; testID?: string };

export function PammitLogo({ compact = false, testID }: PammitLogoProps) {
  return (
    <View accessibilityLabel="パミット" style={styles.logo} testID={testID}>
      <Image
        accessible={false}
        contentFit="contain"
        source={require('../../../assets/images/pammit-logo.png')}
        style={compact ? styles.compactImage : styles.image}
      />
      <View style={styles.brand}>
        <AppText variant={compact ? 'bodyLgBold' : 'display'} style={[styles.name, !compact && styles.fullName]}>パミット</AppText>
        {!compact && (
          <AppText variant="body" numberOfLines={1} style={styles.tagline}>
            ～ ベテラン農家の経験や感覚を形にするアプリ ～
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center' },
  image: { height: 320, marginBottom: -78, width: 320 },
  compactImage: { height: 88, marginBottom: -20, width: 88 },
  brand: { alignItems: 'center' },
  name: { color: colors.primary, textAlign: 'center' },
  fullName: { lineHeight: 80 },
  tagline: { color: colors.primary, lineHeight: 15, textAlign: 'center' },
});
