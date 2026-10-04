import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { AiAvatar, ChatBubble, ChatInput } from '@/components/chat';
import { MenuTile, MetricTile } from '@/components/dashboard';
import { Banner, Dialog, Toast } from '@/components/feedback';
import { FlowFooter, StepHeader, StepIndicator } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { CalendarDay, ScheduleCarousel, ScheduleCard, WorkTypeLegend } from '@/components/schedule';
import {
  AppText,
  Button,
  Card,
  Dropdown,
  IconButton,
  ListItem,
  PinDot,
  PinKey,
  PinKeyValue,
  Radio,
  SmallButton,
  TextField,
} from '@/components/ui';
import { colors } from '@/theme/tokens';

const workOptions = [
  { label: '摘果・摘葉', value: 'thinning' },
  { label: '収穫', value: 'harvest' },
  { label: '灌水', value: 'irrigate' },
] as const;

const legend = [
  { type: 'thinning', label: '摘果・摘葉' },
  { type: 'harvest', label: '収穫' },
  { type: 'irrigate', label: '灌水' },
] as const;

const pinRows: PinKeyValue[][] = [
  ['1', '2', '3'],
  ['delete', '0', 'submit'],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="bodyLgBold" style={styles.sectionTitle}>{title}</AppText>
      {children}
    </View>
  );
}

export default function AllComponentsPreview() {
  const [text, setText] = useState('入力内容');
  const [from, setFrom] = useState('08:00');
  const [to, setTo] = useState('17:00');
  const [works, setWorks] = useState<string[]>([]);
  const [radio, setRadio] = useState('schedule');
  const [pin, setPin] = useState('12');
  const [chat, setChat] = useState('');
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState(true);
  const [day, setDay] = useState(4);
  const [tab, setTab] = useState<'home' | 'schedule' | 'farm' | 'ai' | 'admin'>('home');

  if (!__DEV__) return <Redirect href="/" />;

  const handlePin = (value: PinKeyValue) => {
    if (value === 'delete') setPin((current) => current.slice(0, -1));
    else if (value !== 'submit') setPin((current) => current.length < 4 ? current + value : current);
  };

  return (
    <PageLayout
      header={<ScreenHeader title="全部品一覧" />}
      testID="all-components-preview">
      <AppText variant="caption" style={styles.note}>
        ここにあるのは、すべて実際のアプリで使う部品です。
      </AppText>

      <Section title="HeaderBackground・PageLayout・ScreenHeader">
        <View style={styles.backgroundPreview}>
          <HeaderBackground />
          <AppText variant="title" style={styles.centerText}>ヘッダー背景</AppText>
        </View>
      </Section>

      <Section title="Button">
        <Button label="次へ" onPress={() => undefined} />
        <Button label="戻る" variant="secondary" onPress={() => undefined} />
      </Section>

      <Section title="TextField">
        <TextField label="名前" value={text} onChangeText={setText} />
        <TextField type="time-range" label="作業時間" from={from} to={to} onChangeFrom={setFrom} onChangeTo={setTo} />
      </Section>

      <Section title="Card">
        <Card title="カードの見出し" body="カードの本文です。" />
      </Section>

      <Section title="IconButton・SmallButton">
        <View style={styles.row}>
          <IconButton accessibilityLabel="追加" icon="plus" onPress={() => undefined} />
          <SmallButton label="保存" onPress={() => undefined} />
          <SmallButton label="キャンセル" variant="outline" onPress={() => undefined} />
        </View>
      </Section>

      <Section title="Dropdown（複数選択あり）・ListItem">
        <Dropdown label="作業を選ぶ" options={workOptions} value={works} onChange={setWorks} multiple />
        <ListItem title="三番ハウス" description="トマト・12a" selected onPress={() => undefined} />
      </Section>

      <Section title="Radio">
        <Radio label="予定から選ぶ" selected={radio === 'schedule'} onPress={() => setRadio('schedule')} />
        <Radio label="新しく始める" selected={radio === 'new'} onPress={() => setRadio('new')} />
      </Section>

      <Section title="PinDot・PinKey">
        <View style={styles.dots}>
          {Array.from({ length: 4 }, (_, index) => <PinDot key={index} filled={index < pin.length} />)}
        </View>
        <View style={styles.keypad}>
          {pinRows.map((row, index) => (
            <View key={index} style={styles.keyRow}>
              {row.map((value) => <PinKey key={value} value={value} onPress={handlePin} />)}
            </View>
          ))}
        </View>
      </Section>

      <Section title="StepIndicator・StepHeader・FlowFooter">
        <StepIndicator current={2} total={4} />
        <View style={styles.fullWidth}><StepHeader title="農園を選ぶ" current={2} total={4} onBack={() => undefined} /></View>
        <View style={styles.fullWidth}><FlowFooter nextLabel="次へ" onNext={() => undefined} onBack={() => undefined} /></View>
      </Section>

      <Section title="AiAvatar・ChatBubble・ChatInput">
        <View style={styles.avatar}><AiAvatar /></View>
        <ChatBubble sender="user" message="この葉は切った方がいいですか？" time="10:20" />
        <ChatBubble sender="ai" message="傷んでいる葉だけを切りましょう。" time="10:21" />
        <ChatInput value={chat} onChangeText={setChat} onSend={() => setChat('')} />
      </Section>

      <Section title="Banner（帽子 / 通信）・Dialog・Toast">
        <Banner kind="hat" actionLabel="再接続" onAction={() => undefined} />
        <Banner kind="network" actionLabel="再試行" onAction={() => undefined} />
        <SmallButton label="Dialogを表示" onPress={() => setDialog(true)} />
        <Toast visible={toast} message="保存しました" />
        <Dialog
          visible={dialog}
          title="この内容で保存しますか？"
          body="選んだ作業内容を保存します。"
          confirmLabel="保存"
          onConfirm={() => { setDialog(false); setToast(true); }}
          onCancel={() => setDialog(false)}
        />
      </Section>

      <Section title="MetricTile・MenuTile">
        <View style={styles.row}>
          <MetricTile label="土壌水分" value="35" unit="%" detail="前日より +2%" />
          <MenuTile title="農園日誌" icon={<Image accessible={false} contentFit="cover" source={require('../../../assets/images/admin/journal.png')} style={styles.menuImage} />} onPress={() => undefined} />
        </View>
      </Section>

      <Section title="CalendarDay（＋円グラフ、点線は SVG）・WorkTypeLegend">
        <View style={styles.calendar}>
          {[1, 2, 3, 4, 5, 6, 7].map((value) => (
            <CalendarDay
              key={value}
              day={value}
              workTypes={value === 4 ? ['thinning', 'harvest', 'irrigate'] : value === 6 ? ['harvest'] : []}
              selected={day === value}
              isSunday={value === 1}
              isSaturday={value === 7}
              onPress={() => setDay(value)}
            />
          ))}
        </View>
        <WorkTypeLegend items={legend} />
      </Section>

      <Section title="ScheduleCard・ScheduleCarousel（横スクロール）">
        <ScheduleCard start="09:00" end="10:30" work="摘果・摘葉" workType="thinning" place="三番ハウス" members={['山田さん', '佐藤さん']} />
        <ScheduleCarousel
          schedules={[
            { id: '1', start: '09:00', end: '10:30', work: '摘果・摘葉', workType: 'thinning', place: '三番ハウス', members: ['山田さん'] },
            { id: '2', start: '13:00', end: '14:00', work: '収穫', workType: 'harvest', place: '一番ハウス', members: ['鈴木さん'] },
          ]}
          onSchedulePress={() => undefined}
        />
      </Section>

      <Section title="BottomNav">
        <BottomNav role="owner" activeTab={tab} onTabPress={setTab} />
      </Section>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textSub },
  section: { gap: 12, paddingVertical: 8 },
  sectionTitle: { color: colors.textDeep },
  backgroundPreview: { height: 150, justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  centerText: { textAlign: 'center' },
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuImage: { height: 96, width: 96 },
  dots: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  keypad: { alignItems: 'center', gap: 10 },
  keyRow: { flexDirection: 'row', gap: 18, justifyContent: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  avatar: { alignItems: 'center' },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'center' },
});
