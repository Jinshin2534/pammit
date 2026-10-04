import { router } from 'expo-router';
import { useState } from 'react';
import { Toast } from '@/components/feedback';
import { FlowFooter } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Card, TextField } from '@/components/ui';

export default function JournalPdfScreen() {
  const [from, setFrom] = useState('2026-10-01');
  const [to, setTo] = useState('2026-10-31');
  const [created, setCreated] = useState(false);
  const create = () => { setCreated(true); setTimeout(() => setCreated(false), 2000); };
  return <PageLayout header={<ScreenHeader title="農園日誌をPDF" showBack onBack={() => router.back()} topPadding={16} />} footer={<FlowFooter nextLabel="PDFを作成" onBack={() => router.back()} onNext={create} />} testID="journal-pdf-screen"><AppText>日誌に含める期間を選んでください。</AppText><TextField label="開始日" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" /><TextField label="終了日" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" /><Card title="PDFに含まれる内容" body="作業日時、園地、作業内容、担当者、判定件数、今日の気づき、備考" variant="filled" /><Toast visible={created} message="PDFを作成しました" /></PageLayout>;
}
