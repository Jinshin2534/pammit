import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Button, Dropdown } from '@/components/ui';
import { ScheduleWorkType, useAppState } from '@/providers/app-state';
import { colors, fonts, radii } from '@/theme/tokens';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;

const workOptions: { label: string; value: ScheduleWorkType }[] = [
  { label: '摘果・摘葉', value: 'thinning' },
  { label: '収穫', value: 'harvest' },
  { label: '灌水', value: 'irrigate' },
  { label: '防除', value: 'spray' },
  { label: '肥料', value: 'fertilize' },
  { label: '草刈り', value: 'mow' },
  { label: 'その他', value: 'other' },
];

export default function NewScheduleScreen() {
  const { date = '2026-10-10', id, source } = useLocalSearchParams<{ date?: string; id?: string; source?: string }>();
  const { saveSchedule, schedules, farms, users, session } = useAppState();
  const plotOptions = farms.map(({ name }) => ({ label: name, value: name }));
  const memberOptions = users.filter((user) => user.role === 'worker').map(({ name }) => ({ label: name, value: name }));
  const existing = schedules.find((schedule) => schedule.id === id);
  const farmSuggestion = source === 'farm';
  const [plot, setPlot] = useState(existing?.place ?? 'すだち農園');
  const [workType, setWorkType] = useState<ScheduleWorkType>(existing?.workType ?? (farmSuggestion ? 'irrigate' : 'harvest'));
  const [work, setWork] = useState(existing?.work ?? (farmSuggestion ? '土の状態を確認' : '収穫'));
  const [members, setMembers] = useState<string[]>(existing?.members.length ? [...existing.members] : ['長谷川']);
  const [note, setNote] = useState(existing?.note ?? '（なし）');
  const parsedDate = new Date(`${date}T12:00:00`);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  const selectWork = (next: string[]) => {
    const nextType = next[0] as ScheduleWorkType;
    setWorkType(nextType);
    setWork(workOptions.find((option) => option.value === nextType)?.label ?? 'その他');
  };

  const save = () => {
    saveSchedule({
      id,
      date,
      start: existing?.start ?? '08:00',
      end: existing?.end ?? '17:00',
      work,
      workType,
      place: plot,
      members,
      note,
    });
    router.replace({ pathname: '/(tabs)/schedule', params: { date } });
  };

  return <PageLayout
    background={<HeaderBackground />}
    header={<ScreenHeader title={existing ? '予定を変更' : '予定を入力'} showBack onBack={() => router.back()} />}
    footer={<BottomNav role={session.role} activeTab="schedule" onTabPress={(tab) => router.navigate(routes[tab])} />}
    testID="schedule-input-screen">
    <AppText variant="bodyLgBold">{parsedDate.getMonth() + 1}月{parsedDate.getDate()}日（{weekdays[parsedDate.getDay()]}）</AppText>
    <View style={styles.fieldGroup}>
      <AppText variant="bodyLg">時間</AppText>
      <Pressable accessibilityRole="button" style={styles.field}>
        <AppText variant="bodyLg">08:00</AppText><AppText variant="bodyLg">〜</AppText><AppText variant="bodyLg">17:00</AppText>
      </Pressable>
    </View>
    <Dropdown label="農園" options={plotOptions} value={[plot]} onChange={(next) => setPlot(next[0])} testID="schedule-plot" />
    <Dropdown label="作業" options={workOptions} value={[workType]} onChange={selectWork} testID="schedule-work" />
    <Dropdown label="担当（複数選択可）" options={memberOptions} value={members} multiple onChange={setMembers} testID="schedule-member" />
    <View style={styles.fieldGroup}>
      <AppText variant="bodyLg">備考</AppText>
      <TextInput accessibilityLabel="備考" maxFontSizeMultiplier={1.2} onChangeText={setNote} style={styles.textField} value={note} />
    </View>
    <Button label="内容を保存する" size="lg" onPress={save} />
  </PageLayout>;
}

const styles = StyleSheet.create({
  fieldGroup: { gap: 8 },
  field: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: 4, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 20, width: '100%' },
  textField: { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: 4, color: colors.text, fontFamily: fonts.medium, fontSize: 23, height: 58, lineHeight: 25, paddingHorizontal: 20, paddingVertical: 0 },
});
