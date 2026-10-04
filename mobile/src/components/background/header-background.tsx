import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

export type HeaderBackgroundProps = {
  position?: 'top' | 'center';
  testID?: string;
};

export function HeaderBackground({ position = 'top', testID }: HeaderBackgroundProps) {
  const centerY = position === 'top' ? 0 : 400;
  const gradientId = `header-glow-${useId().replace(/:/g, '')}`;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.background}
      testID={testID}>
      <Svg height="100%" width="100%" viewBox="0 0 360 800" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={gradientId} cx={180} cy={centerY} r={241} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFC64C" />
            <Stop offset="0.451934" stopColor="#FFC64C" stopOpacity="0.9" />
            <Stop offset="0.822136" stopColor="#FFBC5E" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#FFBC6D" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={180} cy={centerY} r={241} fill={`url(#${gradientId})`} />
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
