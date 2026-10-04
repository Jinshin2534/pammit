import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export type HeaderBackgroundProps = {
  position?: 'top' | 'center';
  testID?: string;
};

export function HeaderBackground({ position = 'top', testID }: HeaderBackgroundProps) {
  const centerY = position === 'top' ? '8%' : '48%';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.background}
      testID={testID}>
      <Svg height="100%" width="100%">
        <Defs>
          <RadialGradient id="header-glow" cx="50%" cy={centerY} rx="70%" ry="44%">
            <Stop offset="0" stopColor="#FFC64C" stopOpacity="0.48" />
            <Stop offset="0.58" stopColor="#FFC64C" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#FFC64C" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#header-glow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
