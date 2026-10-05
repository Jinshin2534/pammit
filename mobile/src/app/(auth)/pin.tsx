import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage, isApiError } from '@/api';
import { HeaderBackground } from '@/components/background/header-background';
import { TopBanner, useHeaderPaddingBelowBanner } from '@/components/feedback';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText } from '@/components/ui';
import { msUntil } from '@/lib/datetime';
import { useAuth } from '@/providers/auth';
import { colors, radii } from '@/theme/tokens';

type KeyValue = `${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | 'submit' | 'delete';

const rows: readonly (readonly KeyValue[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['submit', '0', 'delete'],
];

const submitIcon = require('../../../assets/figma/auth-home/pin-04.svg');
const deleteIcon = require('../../../assets/figma/auth-home/pin-05.svg');

function lockMessage(remainingMs: number) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const remaining = minutes > 0 ? `${minutes}分${seconds > 0 ? `${seconds}秒` : ''}` : `${seconds}秒`;
  return `PINを続けて間違えたため、あと${remaining}ログインできません`;
}

function backToRoleSelect() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/(auth)/role');
}

export default function PinScreen() {
  const { userId: userIdParam, userName = '', remembered } = useLocalSearchParams<{
    role?: string;
    userId?: string;
    userName?: string;
    /** 前回ログインした人として開いたとき '1' */
    remembered?: string;
  }>();
  const userId = Number(userIdParam);
  const { signIn } = useAuth();
  const paddingBelowBanner = useHeaderPaddingBelowBanner();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const lockRemainingMs = lockedUntil ? msUntil(lockedUntil, new Date(now)) : 0;
  const locked = lockRemainingMs > 0;

  // ロック中は残り時間を1秒ごとに減らす
  useEffect(() => {
    if (!lockedUntil) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (msUntil(lockedUntil, new Date(current)) === 0) setLockedUntil(null);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const login = useMutation({
    mutationFn: (value: string) => signIn(userId, value),
    onSuccess: () => {
      // TODO(作業画面をつなぐとき): fetchMyActiveWorkSessions() で終わっていない作業があれば作業中の画面へ
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)');
    },
    onError: (cause) => {
      setPin('');
      if (isApiError(cause, 'pin_locked')) {
        const until = cause.detail?.locked_until;
        setError(null);
        setNow(Date.now());
        setLockedUntil(typeof until === 'string' ? until : null);
        return;
      }
      if (isApiError(cause, 'invalid_pin')) {
        setError('名前か PIN が正しくありません');
        return;
      }
      setError(errorMessage(cause));
    },
  });

  const bannerMessage = locked ? lockMessage(lockRemainingMs) : error;

  const pressKey = (value: KeyValue) => {
    if (value === 'submit') {
      if (pin.length === 4 && !locked && !login.isPending && Number.isInteger(userId)) {
        setError(null);
        login.mutate(pin);
      }
      return;
    }
    if (value === 'delete') {
      setPin((current) => current.slice(0, -1));
      return;
    }
    setPin((current) => (current.length < 4 ? current + value : current));
  };

  return (
    <PageLayout
      background={<HeaderBackground position="top" />}
      header={
        <View>
          {bannerMessage && <TopBanner kind="network" message={bannerMessage} testID="pin-error-banner" />}
          <ScreenHeader title="PINを入力" topPadding={bannerMessage ? paddingBelowBanner : 40} />
        </View>
      }
      scrollable={false}
      testID="pin-screen">
      <View style={styles.welcomeSlot}>
        <AppText variant="bodyLg" numberOfLines={1} style={styles.welcome}>
          {`ようこそ${userName}さん`}
        </AppText>
      </View>

      <View accessibilityLabel={`PINを${pin.length}文字入力済み`} style={styles.dots}>
        {Array.from({ length: 4 }, (_, index) => (
          <View
            key={index}
            accessibilityLabel={index < pin.length ? '入力済み' : '未入力'}
            style={[styles.dot, index < pin.length && styles.dotFilled]}
            testID={`pin-dot-${index}`}
          />
        ))}
      </View>

      <View style={styles.spacer} />

      <View style={styles.keypad}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((value) => (
              <Pressable
                key={value}
                accessibilityLabel={
                  value === 'delete'
                    ? '1文字消す'
                    : value === 'submit'
                      ? 'PINを決定'
                      : `${value}を入力`
                }
                accessibilityRole="button"
                onPress={() => pressKey(value)}
                testID={`pin-key-${value}`}
                style={({ pressed }) => [styles.key, pressed && styles.pressed]}>
                {value === 'delete' || value === 'submit' ? (
                  <Image
                    source={value === 'delete' ? deleteIcon : submitIcon}
                    style={styles.keyIcon}
                    contentFit="fill"
                    accessible={false}
                  />
                ) : (
                  <AppText variant="title">{value}</AppText>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {(remembered === '1' || locked) && (
        <Pressable
          accessibilityRole="button"
          onPress={backToRoleSelect}
          style={({ pressed }) => [styles.switchUser, pressed && styles.pressed]}
          testID="pin-switch-user">
          <AppText variant="bodyLg" style={styles.switchUserText}>
            別の人でログイン
          </AppText>
        </Pressable>
      )}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  welcomeSlot: {
    alignSelf: 'stretch',
    height: 25,
    marginTop: 8,
    position: 'relative',
  },
  welcome: {
    left: -20,
    lineHeight: 25,
    maxWidth: 320,
    position: 'absolute',
    textAlign: 'center',
    width: 320,
  },
  dots: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 37,
  },
  dot: {
    backgroundColor: colors.surface,
    borderColor: colors.text,
    borderRadius: radii.full,
    borderWidth: 3,
    height: 30,
    width: 30,
  },
  dotFilled: {
    backgroundColor: colors.text,
  },
  spacer: {
    alignSelf: 'center',
    height: 34,
    width: 10,
  },
  keypad: {
    alignSelf: 'center',
    gap: 23,
  },
  row: {
    flexDirection: 'row',
    gap: 30,
  },
  key: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.full,
    height: 75,
    justifyContent: 'center',
    width: 75,
  },
  keyIcon: {
    height: 45,
    width: 45,
  },
  switchUser: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchUserText: {
    color: colors.link,
    lineHeight: 25,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
});
