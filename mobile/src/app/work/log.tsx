import { router } from 'expo-router';
import { ChatBubble } from '@/components/chat';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText } from '@/components/ui';

export default function WorkAiLogScreen() {
  return <PageLayout header={<ScreenHeader title="AI相談ログ" showBack onBack={() => router.back()} topPadding={16} />} testID="work-ai-log-screen"><AppText variant="caption">この作業中に相談した内容</AppText><ChatBubble sender="user" message="この葉は切った方がいいですか？" time="10:20" /><ChatBubble sender="ai" message="黄色く傷んだ葉だけを、付け根から切りましょう。元気な葉は残してください。" time="10:20" /><ChatBubble sender="user" message="実の近くの葉はどうしますか？" time="10:34" /><ChatBubble sender="ai" message="日差しが強すぎないよう、実を少し覆う葉は残すのがおすすめです。" time="10:34" /></PageLayout>;
}
