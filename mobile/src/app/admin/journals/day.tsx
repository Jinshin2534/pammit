import { router, useLocalSearchParams } from 'expo-router';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Card, TextField } from '@/components/ui';

export default function JournalDayScreen() {
  const { day = '4' } = useLocalSearchParams<{ day?: string }>();
  return <PageLayout header={<ScreenHeader title={`10月${day}日の農園日誌`} showBack onBack={() => router.back()} topPadding={16} />} testID="journal-day-screen"><Card title="09:00〜10:30　摘果・摘葉" body="三番ハウス　担当：確認ユーザー" variant="filled"><AppText>切る 12件 / 残す 35件 / 判断不可 2件</AppText><AppText variant="caption">気づき：入口側の実が大きくなっていた。</AppText></Card><Card title="13:00〜14:00　収穫" body="一番ハウス　担当：山田さん" variant="outlined"><AppText>収穫量：8箱</AppText></Card><TextField label="日誌の備考" value="午後は気温が高かったため、休憩を多めに取った。" onChangeText={() => undefined} /></PageLayout>;
}
