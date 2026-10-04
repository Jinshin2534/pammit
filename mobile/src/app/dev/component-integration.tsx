import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav, BottomNavTab } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { Button, Card, TextField } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';

const tabNames: Record<BottomNavTab, string> = {
  home: 'ホーム',
  schedule: '予定',
  farm: '農園',
  ai: '相談',
  admin: '管理',
};

export default function ComponentIntegrationPreview() {
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState<BottomNavTab>('home');
  const [message, setMessage] = useState('まだ操作されていません');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <PageLayout
      testID="component-integration-ready"
      header={
        <ScreenHeader
          title="部品の組み合わせ確認"
          showBack
          onBack={() => setMessage('戻るボタンを押しました')}
          topPadding={16}
          testID="integration-header"
        />
      }
      footer={
        <BottomNav
          role="owner"
          activeTab={activeTab}
          onTabPress={(tab) => {
            setActiveTab(tab);
            setMessage(`${tabNames[tab]}タブを押しました`);
          }}
          testID="integration-nav"
        />
      }>
      <Card
        title="現在の状態"
        body={`${message}\n選択中のタブ：${tabNames[activeTab]}`}
        variant="muted"
        testID="integration-status"
      />

      <Card title="作業者の入力" body="文字を入力できることを確認します。">
        <TextField
          label="名前"
          value={name}
          onChangeText={setName}
          placeholder="例：山田 花子"
          testID="integration-name"
        />
      </Card>

      <Card title="作業時間" body="時間欄を押せることを確認します。" variant="filled">
        <TextField
          type="time-range"
          label="作業時間"
          from="09:00"
          to="12:00"
          onPress={() => setMessage('作業時間を押しました')}
          testID="integration-time"
        />
      </Card>

      <Card title="入力内容の確認" variant="outlined">
        <Text style={styles.summary} testID="integration-name-result">
          {name ? `入力した名前：${name}` : '名前はまだ入力されていません'}
        </Text>
        <Button
          label="この内容で進む"
          size="lg"
          onPress={() => setMessage(`${name || '名前未入力'}でボタンを押しました`)}
          testID="integration-submit"
        />
      </Card>

      <View style={styles.scrollCheck} testID="integration-scroll-end">
        <Text style={styles.scrollTitle}>スクロール確認</Text>
        <Text style={styles.summary}>
          ここまで見えたら、本文だけを最後までスクロールできています。
        </Text>
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  summary: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 15,
    includeFontPadding: false,
    lineHeight: 22,
  },
  scrollCheck: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  scrollTitle: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 20,
    includeFontPadding: false,
    lineHeight: 24,
  },
});
