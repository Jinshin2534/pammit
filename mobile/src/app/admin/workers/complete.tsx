import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AdminButton, AdminHeader, AdminPage, adminTextStyles } from '@/components/admin/figma-admin-ui';
import { colors, fonts, radii, strokes } from '@/theme/tokens';

export default function WorkerCompleteScreen() {
  const { name = '田中みのる' } = useLocalSearchParams<{ name?: string }>();

  return (
    <AdminPage header={<AdminHeader title="登録完了" />} contentStyle={styles.content} footer={<View style={styles.footer}><AdminButton label="管理者画面へ戻る" size="lg" fullWidth onPress={() => router.replace('/admin')} /></View>} testID="worker-complete-screen">
      <Text maxFontSizeMultiplier={1.2} style={[adminTextStyles.bodyLg, styles.completeText]}>{name} さんを登録しました</Text>
      <View style={styles.pinCard}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.body}>ログイン用のPIN</Text>
        <Text maxFontSizeMultiplier={1.2} style={styles.pin}>4821</Text>
      </View>
      <Text maxFontSizeMultiplier={1.2} style={[adminTextStyles.caption, styles.caption]}>この番号はこの画面でしか表示されません。本人に伝えるか、メモして渡してください。</Text>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  completeText: { alignSelf: 'stretch', lineHeight: 31, textAlign: 'center' },
  pinCard: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, gap: 4, height: 92, paddingVertical: 7 },
  pin: { color: colors.text, fontFamily: fonts.medium, fontSize: 40, includeFontPadding: false, lineHeight: 48 },
  caption: { alignSelf: 'stretch', textAlign: 'center' },
  footer: { paddingBottom: 32, paddingHorizontal: 40, paddingTop: 12, width: '100%' },
});
