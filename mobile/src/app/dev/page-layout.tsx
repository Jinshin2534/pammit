import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { colors, fonts, radii, strokes } from '@/theme/tokens';

export default function PageLayoutPreview() {
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState(initialMode ?? 'standard');

  if (!__DEV__) return <Redirect href="/" />;

  const centered = mode === 'centered';
  const long = mode === 'long';

  return (
    <PageLayout
      testID="page-layout-preview-ready"
      header={<ScreenHeader title="画面の骨格" testID="page-layout-header" />}
      variant={centered ? 'centered' : 'standard'}
      contentPadding={mode === 'wide' ? 16 : 40}
      footer={
        <View style={styles.footer} testID="page-layout-footer-content">
          <Text style={styles.text}>下部バーの配置領域</Text>
        </View>
      }>
      <View style={styles.modes}>
        {[
          ['standard', '通常'],
          ['centered', '中央'],
          ['long', '長い本文'],
          ['wide', '余白16'],
        ].map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setMode(value)}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === value }}
            testID={`page-layout-mode-${value}`}
            style={styles.mode}>
            <Text style={styles.text}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.sample} testID="page-layout-first-content">
        <Text style={styles.title}>{centered ? '本文を中央に配置' : 'ここに画面の本文を配置'}</Text>
        <Text style={styles.text}>
          上のタイトルと下部バーは固定。本文だけがスクロールします。
        </Text>
      </View>
      {long && Array.from({ length: 12 }, (_, index) => (
        <View style={styles.sample} key={index} testID={`page-layout-row-${index}`}>
          <Text style={styles.text}>スクロール確認 {index + 1}</Text>
          <Text style={styles.text}>長い本文でも最後の項目まで確認できます。</Text>
        </View>
      ))}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mode: { borderWidth: 1, borderColor: colors.primary, padding: 8, borderRadius: radii.md },
  sample: {
    borderWidth: strokes.default,
    borderColor: colors.primary,
    borderRadius: radii.md,
    padding: 16,
    gap: 12,
  },
  title: { fontFamily: fonts.medium, fontSize: 20, lineHeight: 24, includeFontPadding: false },
  text: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 18, includeFontPadding: false },
  footer: { alignItems: 'center', borderTopWidth: 1, borderColor: colors.primary, padding: 16 },
});
