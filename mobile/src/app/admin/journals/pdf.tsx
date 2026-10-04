import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminButton, AdminFlowFooter, AdminHeader, AdminPage, adminTextStyles } from '@/components/admin/figma-admin-ui';
import { colors, radii, strokes } from '@/theme/tokens';

export default function JournalPdfScreen() {
  const [exported, setExported] = useState(false);
  return (
    <AdminPage header={<AdminHeader title="農園日誌を出力" />} footer={<AdminFlowFooter backOnly onBack={() => router.back()} />} testID="journal-pdf-screen">
      <View style={styles.group}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>期間</Text>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.range, pressed && styles.pressed]}>
          <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>8/1</Text>
          <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>〜</Text>
          <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>10/22</Text>
        </Pressable>
      </View>
      <View style={styles.exportGroup}>
        <AdminButton label="PDFを出力" variant="cta" onPress={() => setExported(true)} />
        {exported && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.2} style={styles.exported}>出力しました</Text>}
      </View>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  group: { alignSelf: 'stretch', gap: 8 },
  range: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 20 },
  pressed: { opacity: 0.7 },
  exportGroup: { alignItems: 'center', alignSelf: 'stretch', gap: 10 },
  exported: { ...adminTextStyles.bodyLg, color: colors.primary },
});
