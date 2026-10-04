import { ReactNode, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBackground } from '@/components/background/header-background';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Button, Card } from '@/components/ui';
import { colors, radii, spacing } from '@/theme/tokens';

export type HomeSchedule = {
  id: string;
  start: string;
  end: string;
  work: string;
  place: string;
  members: readonly string[];
};

export type HomePageProps = {
  userName: string;
  advice: { summary: string; detail: string };
  schedules: readonly HomeSchedule[];
  footer?: ReactNode;
  onWorkStart: () => void;
  onAi: () => void;
  onSchedule: () => void;
};

export function HomePage({
  userName,
  advice,
  schedules,
  footer,
  onWorkStart,
  onAi,
  onSchedule,
}: HomePageProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const orderedSchedules = [...schedules].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <>
      <PageLayout
        background={<HeaderBackground position="top" testID="home-background" />}
        header={<ScreenHeader title="今日のひとこと" topPadding={16} />}
        footer={footer}
        testID="home-screen">
        <AppText variant="bodyMd">{advice.summary}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="今日のひとことを詳しく見る"
          onPress={() => setDetailOpen(true)}
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          testID="home-advice-more">
          <AppText variant="caption" style={styles.link}>詳しく見る</AppText>
        </Pressable>

        <AppText variant="bodyLg">{userName} さん</AppText>

        <Card title="今日の予定" variant="outlined" testID="home-today-card">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleRow}>
            {orderedSchedules.length === 0 ? (
              <AppText>今日の予定はありません</AppText>
            ) : orderedSchedules.map((schedule) => (
              <Card key={schedule.id} variant="filled" style={styles.scheduleCard}>
                <AppText variant="bodyBold">{schedule.start} 〜 {schedule.end}</AppText>
                <AppText variant="bodyLgBold">{schedule.work}</AppText>
                <AppText variant="caption">場所　{schedule.place}</AppText>
                <AppText variant="caption">担当　{schedule.members.join('・') || '未指定'}</AppText>
              </Card>
            ))}
          </ScrollView>
        </Card>

        <Button label="作業を始める！" size="lg" variant="cta" onPress={onWorkStart} testID="home-start-work" />
        <View style={styles.shortcuts}>
          <Button label="AI相談" size="lg" variant="secondary" style={styles.shortcut} onPress={onAi} testID="home-ai" />
          <Button label="予定管理" size="lg" variant="secondary" style={styles.shortcut} onPress={onSchedule} testID="home-schedule" />
        </View>
      </PageLayout>

      <Modal visible={detailOpen} transparent animationType="fade" onRequestClose={() => setDetailOpen(false)}>
        <SafeAreaView style={styles.backdrop}>
          <View style={styles.dialog} accessibilityViewIsModal testID="home-advice-dialog">
            <AppText variant="bodyLgBold">今日のひとことAI</AppText>
            <AppText>{advice.detail}</AppText>
            <Button label="閉じる" variant="primary" size="lg" onPress={() => setDetailOpen(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  more: { alignSelf: 'flex-end', paddingVertical: 8 },
  link: { color: colors.link },
  pressed: { opacity: 0.7 },
  scheduleRow: { gap: 12 },
  scheduleCard: { width: 200 },
  shortcuts: { flexDirection: 'row', gap: spacing.gap },
  shortcut: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(217, 217, 217, 0.85)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.pageX,
  },
  dialog: {
    backgroundColor: colors.surfaceWarm,
    borderRadius: radii.md,
    gap: spacing.gap,
    maxWidth: 480,
    padding: 24,
    width: '100%',
  },
});
