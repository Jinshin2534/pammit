import { Image } from 'expo-image';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { memberSummary } from '@/components/schedule/schedule-items';
import { AppText, Button } from '@/components/ui';
import { colors, fonts, radii, spacing, strokes } from '@/theme/tokens';

export type HomeSchedule = {
  /** カードごとの id。1つの予定に作業が複数あるときはカードを分ける */
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
  /** 日本時間の今の日時。「2026 / 10 / 10 (土)   12:15」の形 */
  now: string;
  schedules: readonly HomeSchedule[];
  offline?: boolean;
  footer?: ReactNode;
  onAdviceDetail: () => void;
  onSettings: () => void;
  onWorkStart: () => void;
  onAi: () => void;
  onSchedule: () => void;
  onScheduleEdit?: (id: string) => void;
};

const moreArrow = require('../../../assets/figma/auth-home/home-02.svg');
const divider = require('../../../assets/figma/auth-home/home-06.svg');
const timeLine = require('../../../assets/figma/auth-home/home-07.svg');
const settingsGear = require('../../../assets/figma/auth-home/settings-gear.png');

export function HomePage({
  userName,
  advice,
  now,
  schedules,
  offline = false,
  footer,
  onAdviceDetail,
  onSettings,
  onWorkStart,
  onAi,
  onSchedule,
  onScheduleEdit,
}: HomePageProps) {
  const orderedSchedules = [...schedules].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <PageLayout
      background={<HeaderBackground position="top" testID="home-background" />}
      header={
        <View>
          {offline && <OfflineBanner />}
          <ScreenHeader title="今日のひとこと" topPadding={offline ? 16 : 40} />
        </View>
      }
      footer={footer}
      scrollable={false}
      testID="home-screen">
      <AppText variant="bodyMd" style={styles.summary}>
        {advice.summary}
      </AppText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="今日のひとことを詳しく見る"
        onPress={onAdviceDetail}
        style={({ pressed }) => [styles.more, pressed && styles.pressed]}
        testID="home-advice-more">
        <AppText variant="caption" style={styles.moreLabel}>詳しく</AppText>
        <Image source={moreArrow} style={styles.moreArrow} contentFit="fill" accessible={false} />
      </Pressable>

      <View style={styles.userRow}>
        <View style={styles.userBlock}>
          <AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={styles.userName}>{userName} さん</AppText>
          <View style={styles.datePill}>
            <View style={styles.dateAccent} />
            <AppText variant="caption" style={styles.dateText}>
              {now}
            </AppText>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="設定を開く"
          onPress={onSettings}
          style={({ pressed }) => [styles.settings, pressed && styles.pressed]}
          testID="home-settings">
          <Image source={settingsGear} style={styles.settingsIcon} contentFit="contain" accessible={false} />
          <AppText variant="bodyLg" numberOfLines={1} style={styles.settingsLabel}>設定</AppText>
        </Pressable>
      </View>

      <View style={styles.todayCard} testID="home-today-card">
        <AppText variant="bodyLg" style={styles.todayTitle}>今日の予定</AppText>
        <View style={styles.dividerSlot}>
          <Image source={divider} style={styles.divider} contentFit="fill" accessible={false} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
          contentContainerStyle={styles.scheduleRow}>
          {orderedSchedules.map((schedule) => (
            <Pressable key={schedule.id} accessibilityRole="button" onPress={() => onScheduleEdit?.(schedule.id)} style={({ pressed }) => [styles.scheduleCard, pressed && styles.pressed]}>
              <View style={styles.timeRow}>
                <AppText style={styles.time}>{schedule.start}</AppText>
                <Image source={timeLine} style={styles.timeLine} contentFit="fill" accessible={false} />
                <AppText style={styles.time}>{schedule.end}</AppText>
              </View>
              <View style={styles.scheduleCopy}>
                <AppText variant="bodyLg" numberOfLines={1} style={styles.workName}>
                  {schedule.work}
                </AppText>
                <View style={styles.scheduleDetails}>
                  <ScheduleDetail label="場所" value={schedule.place} />
                  <ScheduleDetail label="担当" value={memberSummary(schedule.members)} />
                </View>
              </View>
            </Pressable>
          ))}
          <Pressable onPress={onSchedule} style={({ pressed }) => [styles.addSchedule, pressed && styles.pressed]}>
            <AppText variant="bodyLg" style={styles.addScheduleText}>＋予定を追加</AppText>
          </Pressable>
        </ScrollView>
      </View>

      <Button label="作業を始める！" size="lg" variant="primary" onPress={onWorkStart} style={styles.startButton} testID="home-start-work" />

      <View style={styles.shortcuts}>
        <ShortcutButton label="ベテランAI相談" onPress={onAi} testID="home-ai" />
        <ShortcutButton label="予定管理" onPress={onSchedule} testID="home-schedule" />
      </View>
    </PageLayout>
  );
}

function ScheduleDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="small" style={styles.detailLabel}>{label}</AppText>
      <AppText variant="caption" numberOfLines={1} style={styles.detailValue}>{value}</AppText>
    </View>
  );
}

function ShortcutButton({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
      <AppText style={styles.shortcutLabel} numberOfLines={1}>{label}</AppText>
    </Pressable>
  );
}

function OfflineBanner() {
  return (
    <View accessibilityRole="alert" style={styles.banner} testID="home-offline-banner">
      <View style={styles.bannerIcon}>
        <AppText variant="bodyBold" style={styles.bannerBang}>!</AppText>
      </View>
      <AppText style={styles.bannerMessage}>
        通信が切れています。判定は端末に保存し、つながったら送信します
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    lineHeight: 25,
  },
  more: {
    alignSelf: 'flex-end',
    height: 13,
    width: 101,
  },
  moreLabel: {
    lineHeight: 13,
  },
  moreArrow: {
    height: 15,
    left: 0,
    position: 'absolute',
    top: 6,
    width: 101,
  },
  pressed: {
    opacity: 0.7,
  },
  userRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  userBlock: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  userName: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 18,
  },
  datePill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceWarm,
    flexDirection: 'row',
    gap: 12,
    height: 41,
    overflow: 'hidden',
    paddingRight: 16,
  },
  dateAccent: {
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    width: 18,
  },
  dateText: {
    fontSize: 13,
    lineHeight: 13,
  },
  settings: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
    minWidth: 92,
    paddingRight: 2,
  },
  settingsIcon: {
    height: 44,
    transform: [{ scaleX: -1 }],
    width: 44,
  },
  settingsLabel: {
    flexShrink: 0,
    lineHeight: 25,
  },
  todayCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radii.md,
    borderWidth: strokes.default,
    gap: 8,
    overflow: 'hidden',
    padding: 12,
  },
  todayTitle: {
    lineHeight: 25,
  },
  dividerSlot: {
    height: 0,
    width: '100%',
  },
  divider: {
    height: 2,
    left: 0,
    position: 'absolute',
    top: -1,
    width: '100%',
  },
  carousel: {
    height: 112,
    overflow: 'hidden',
  },
  scheduleRow: {
    alignItems: 'center',
    gap: 3,
    paddingRight: 50,
  },
  scheduleCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    gap: 6,
    height: 112,
    paddingBottom: 10,
    paddingHorizontal: 11,
    paddingTop: 8,
    width: 181,
  },
  timeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  time: {
    fontSize: 15,
    lineHeight: 15,
  },
  timeLine: {
    height: 1,
    width: 40,
  },
  scheduleCopy: {
    gap: 6,
  },
  workName: {
    color: colors.textInverse,
    lineHeight: 25,
  },
  scheduleDetails: {
    gap: 3,
  },
  detailRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 13,
    overflow: 'hidden',
  },
  detailLabel: {
    lineHeight: 10,
  },
  detailValue: {
    flexShrink: 1,
    lineHeight: 13,
  },
  addSchedule: {
    alignSelf: 'center',
    paddingHorizontal: 12,
  },
  addScheduleText: {
    color: colors.textSub,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: spacing.gap,
  },
  shortcut: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: radii.full,
    flex: 1,
    height: 48,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 12,
  },
  shortcutLabel: {
    color: colors.textInverse,
    fontSize: 15,
    lineHeight: 15,
    textAlign: 'center',
  },
  startButton: {
    height: 48,
  },
  banner: {
    alignItems: 'center',
    backgroundColor: colors.cta,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  bannerBang: {
    color: colors.cta,
    lineHeight: 25,
  },
  bannerMessage: {
    color: colors.textInverse,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15,
  },
});
