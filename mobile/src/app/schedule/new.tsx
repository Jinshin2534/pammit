import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Button } from '@/components/ui';
import { colors, fonts, radii } from '@/theme/tokens';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;

function SelectField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return <View style={styles.fieldGroup}>
    <AppText variant="bodyLg">{label}</AppText>
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.field}>
      <AppText variant="bodyLg">{value}</AppText>
      <AppText variant="bodyLg" style={styles.chevron}>▾</AppText>
    </Pressable>
  </View>;
}

export default function NewScheduleScreen() {
  const { day = '12' } = useLocalSearchParams<{ day?: string }>();
  const [plot, setPlot] = useState('すだち農園');
  const [work, setWork] = useState('収穫 / 防除');
  const [member, setMember] = useState('長谷川');
  const [note, setNote] = useState('（なし）');

  return <PageLayout
    background={<HeaderBackground />}
    header={<ScreenHeader title="予定を入力" showBack onBack={() => router.back()} />}
    footer={<BottomNav role="worker" activeTab="schedule" onTabPress={(tab) => router.navigate(routes[tab])} />}
    testID="schedule-input-screen">
    <AppText variant="bodyLgBold">10月{day}日（月）</AppText>
    <View style={styles.fieldGroup}>
      <AppText variant="bodyLg">時間</AppText>
      <Pressable accessibilityRole="button" style={styles.field}>
        <AppText variant="bodyLg">08:00</AppText><AppText variant="bodyLg">〜</AppText><AppText variant="bodyLg">17:00</AppText>
      </Pressable>
    </View>
    <SelectField label="農園" value={plot} onPress={() => setPlot(plot === 'すだち農園' ? '三番ハウス' : 'すだち農園')} />
    <SelectField label="作業" value={work} onPress={() => setWork(work === '収穫 / 防除' ? '灌水' : '収穫 / 防除')} />
    <SelectField label="担当" value={member} onPress={() => setMember(member === '長谷川' ? '野﨑' : '長谷川')} />
    <View style={styles.fieldGroup}>
      <AppText variant="bodyLg">備考</AppText>
      <TextInput accessibilityLabel="備考" maxFontSizeMultiplier={1.2} onChangeText={setNote} style={styles.textField} value={note} />
    </View>
    <Button label="内容を保存する" size="lg" onPress={() => router.replace('/(tabs)/schedule')} />
  </PageLayout>;
}

const styles = StyleSheet.create({
  fieldGroup: { gap: 8 },
  field: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: 4, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 20, width: '100%' },
  chevron: { color: colors.primary },
  textField: { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: 4, color: colors.text, fontFamily: fonts.medium, fontSize: 23, height: 58, lineHeight: 25, paddingHorizontal: 20, paddingVertical: 0 },
});
