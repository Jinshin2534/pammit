import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlowFooter } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { Dropdown, TextField } from '@/components/ui';

const workOptions = ['剪定', '灌水', '肥料', '摘果・摘葉', '収穫', '防除', '草刈り', 'その他'].map((label) => ({ label, value: label }));
const memberOptions = ['確認ユーザー', '山田さん', '佐藤さん'].map((label) => ({ label, value: label }));

export default function NewScheduleScreen() {
  const { day = '4' } = useLocalSearchParams<{ day?: string }>();
  const [plot, setPlot] = useState<string[]>([]);
  const [works, setWorks] = useState<string[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [note, setNote] = useState('');
  return <PageLayout header={<ScreenHeader title="予定を入力" showBack onBack={() => router.back()} topPadding={16} />} footer={<FlowFooter nextLabel="保存" onBack={() => router.back()} onNext={() => router.replace('/(tabs)/schedule')} nextDisabled={!plot.length || !works.length} />} testID="schedule-input-screen"><TextField label="日付" value={`2026年10月${day}日`} onChangeText={() => undefined} disabled /><Dropdown label="園地" options={[{ label: '一番ハウス', value: '一番ハウス' }, { label: '三番ハウス', value: '三番ハウス' }]} value={plot} onChange={setPlot} /><TextField type="time-range" label="作業時間" from="09:00" to="10:30" onPress={() => undefined} /><Dropdown label="作業" options={workOptions} value={works} onChange={setWorks} multiple /><Dropdown label="担当者" options={memberOptions} value={members} onChange={setMembers} multiple /><TextField label="備考" value={note} onChangeText={setNote} placeholder="必要なことを入力" inputProps={{ multiline: true }} /></PageLayout>;
}
