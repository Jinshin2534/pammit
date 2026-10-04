import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PammitLogo } from '@/components/branding';
import { colors } from '@/theme/tokens';

export default function IndexScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <Pressable
        accessibilityLabel="ログインへ進む"
        accessibilityRole="button"
        onPress={() => router.replace('/(auth)/role')}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
        testID="logo-screen">
        <PammitLogo testID="pammit-logo" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 24 },
  pressed: { opacity: 0.7 },
});
