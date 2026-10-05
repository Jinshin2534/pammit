import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage, isApiError, useExportJournals } from '@/api';
import { AdminButton, AdminErrorBanner, AdminFlowFooter, AdminHeader, AdminPage, adminTextStyles } from '@/components/admin/figma-admin-ui';
import { todayJst } from '@/lib/datetime';
import { colors, fonts, radii, strokes } from '@/theme/tokens';

const pad = (value: number) => String(value).padStart(2, '0');
const parts = (date: string) => date.split('-').map(Number) as [number, number, number];
/** "YYYY-MM-DD" ↔ 端末の暦の Date（ピッカー用） */
const toPickerDate = (date: string) => {
  const [year, month, day] = parts(date);
  return new Date(year, month - 1, day);
};
const fromPickerDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** 既定は2か月前の1日から今日まで */
function defaultRange() {
  const today = todayJst();
  const [year, month] = parts(today);
  const start = new Date(Date.UTC(year, month - 3, 1));
  return { from: `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}-01`, to: today };
}

function exportErrorMessage(error: unknown) {
  if (isApiError(error, 'invalid_range')) return '終わりの日は始まりの日より後にしてください';
  if (isApiError(error, 'range_too_long')) return '期間は1年以内にしてください';
  if (isApiError(error, 'storage_not_configured')) return 'この環境ではPDFを出力できません。サーバーの保存先が設定されていません';
  return errorMessage(error);
}

export default function JournalPdfScreen() {
  const [range, setRange] = useState(defaultRange);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [exported, setExported] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportJournals = useExportJournals();

  const exportPdf = () => {
    setExported(false);
    setExportError(null);
    exportJournals.mutate(range, {
      onSuccess: async ({ url }) => {
        try {
          await WebBrowser.openBrowserAsync(url);
          setExported(true);
        } catch {
          setExportError('PDFを開けませんでした');
        }
      },
      onError: (error) => setExportError(exportErrorMessage(error)),
    });
  };

  const changeDate = (date: Date) => {
    const value = fromPickerDate(date);
    setRange((current) => (picking === 'from' ? { ...current, from: value } : { ...current, to: value }));
    setPicking(null);
    setExported(false);
    setExportError(null);
  };

  return (
    <AdminPage
      header={<><AdminErrorBanner message={exportError} testID="journal-pdf-error" /><AdminHeader title="農園日誌を出力" /></>}
      footer={<AdminFlowFooter backOnly onBack={() => router.back()} />}
      testID="journal-pdf-screen">
      <View style={styles.group}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>期間</Text>
        <View style={styles.range}>
          <RangeDate label="始まりの日" date={range.from} onPress={() => setPicking('from')} />
          <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>〜</Text>
          <RangeDate label="終わりの日" date={range.to} align="end" onPress={() => setPicking('to')} />
        </View>
        {picking ? (
          <ExpoDateTimePicker
            accentColor={colors.primary}
            display="default"
            mode="date"
            onDismiss={() => setPicking(null)}
            onValueChange={(_, selected) => changeDate(selected)}
            presentation="dialog"
            themeVariant="light"
            value={toPickerDate(picking === 'from' ? range.from : range.to)}
          />
        ) : null}
      </View>
      <View style={styles.exportGroup}>
        <AdminButton label={exportJournals.isPending ? '作成中…' : 'PDFを出力'} variant="cta" disabled={exportJournals.isPending} onPress={exportPdf} />
        {exported && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.2} style={styles.exported}>出力しました</Text>}
      </View>
    </AdminPage>
  );
}

/** 年は小さく上に、月/日は Figma と同じ大きさで出す */
function RangeDate({ label, date, align = 'start', onPress }: { label: string; date: string; align?: 'start' | 'end'; onPress: () => void }) {
  const [year, month, day] = parts(date);
  return (
    <Pressable
      accessibilityLabel={`${label} ${year}年${month}月${day}日`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.dateButton, align === 'end' && styles.dateButtonEnd, pressed && styles.pressed]}>
      <Text maxFontSizeMultiplier={1.2} style={styles.year}>{year}年</Text>
      <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>{month}/{day}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { alignSelf: 'stretch', gap: 8 },
  range: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 20 },
  dateButton: { alignItems: 'flex-start', gap: 1, justifyContent: 'center', minWidth: 80 },
  dateButtonEnd: { alignItems: 'flex-end' },
  year: { color: colors.textSub, fontFamily: fonts.medium, fontSize: 10, includeFontPadding: false, lineHeight: 11 },
  pressed: { opacity: 0.7 },
  exportGroup: { alignItems: 'center', alignSelf: 'stretch', gap: 10 },
  exported: { ...adminTextStyles.bodyLg, color: colors.primary },
});
