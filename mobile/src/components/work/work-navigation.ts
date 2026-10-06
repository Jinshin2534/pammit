// 作業の画面の行き来。作業中の画面へは、始める画面を戻る先に残さずに移る。
import { router } from 'expo-router';

/**
 * 作業中の画面を開く。作業を始める手順（予定〜確認）は閉じ、戻るとホームになる。
 * resumed: ログインし直したときなど、終わっていない作業に戻ってきたとき（続けるか終えるかを聞く）
 */
export function openActiveWork(sessionId: number, { resumed = false }: { resumed?: boolean } = {}) {
  const params = { sessionId: String(sessionId), ...(resumed ? { resumed: '1' } : {}) };
  if (router.canDismiss()) router.dismissAll();
  router.replace({ pathname: '/work/active', params });
}

/** ログイン直後・起動時に、終わっていない作業があればホームの上に作業中の画面を開く */
export function resumeActiveWork(sessionId: number) {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/(tabs)');
  router.push({ pathname: '/work/active', params: { sessionId: String(sessionId), resumed: '1' } });
}

/** 作業中の画面から AI 相談を開く。AI 相談の画面は sessionId を付けて会話を始める */
export function openWorkChat(sessionId: number) {
  router.push({ pathname: '/(tabs)/ai', params: { from: 'work', sessionId: String(sessionId) } });
}
