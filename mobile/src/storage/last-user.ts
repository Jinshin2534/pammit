// 前回ログインした人。ログインが切れたとき、この人の名前で PIN 画面を出す。
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Role } from '@/api/types';

export type LastUser = { id: number; name: string; role: Role };

const LAST_USER_KEY = 'pammit.last-user.v1';

function isLastUser(value: unknown): value is LastUser {
  const item = value as Partial<LastUser> | null;
  return typeof item?.id === 'number' && typeof item.name === 'string' && (item.role === 'owner' || item.role === 'worker');
}

export async function loadLastUser(): Promise<LastUser | null> {
  try {
    const stored = await AsyncStorage.getItem(LAST_USER_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isLastUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveLastUser(user: LastUser): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_USER_KEY, JSON.stringify({ id: user.id, name: user.name, role: user.role }));
  } catch {
    // 覚えられなくても、次は名前の一覧から選べる
  }
}

export async function clearLastUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_USER_KEY);
  } catch {
    // 消せなくても、ログアウトの画面遷移は続ける
  }
}
