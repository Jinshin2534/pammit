// ログインの状態。トークンと前回利用者を端末から読み、ログイン・ログアウトと、
// ログインが切れたとき（401 token_expired など）の画面の戻し方をまとめて持つ。
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { authKeys, fetchMe, login, useMeQuery } from '@/api/auth';
import { setAuthToken, setSessionErrorHandler } from '@/api/client';
import type { Me } from '@/api/types';
import {
  clearAuthToken,
  clearLastUser,
  LastUser,
  loadAuthToken,
  loadLastUser,
  saveAuthToken,
  saveLastUser,
} from '@/storage';

type AuthValue = {
  /** 端末からトークンと前回利用者を読み終えたか */
  ready: boolean;
  hasToken: boolean;
  lastUser: LastUser | null;
  /** PIN でログインし、ログイン中の人を返す。失敗したら ApiError を投げる */
  signIn: (userId: number, pin: string) => Promise<Me>;
  /** トークンと前回利用者を消す。画面の移動は呼び出し側で行う */
  signOut: () => Promise<void>;
  /** 前回利用者を覚え直す（起動時に /auth/me を取ったとき、名前を変えたとき） */
  rememberUser: (me: Me) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function toLastUser(me: Me): LastUser {
  return { id: me.id, name: me.name, role: me.role };
}

/** 前回の人の PIN 画面、いなければ役割の選択へ戻す */
export function goToLogin(lastUser: LastUser | null) {
  if (router.canDismiss()) router.dismissAll();
  if (lastUser) {
    router.replace({
      pathname: '/(auth)/pin',
      params: { userId: String(lastUser.id), userName: lastUser.name, role: lastUser.role, remembered: '1' },
    });
  } else {
    router.replace('/(auth)/role');
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [lastUser, setLastUser] = useState<LastUser | null>(null);
  const lastUserRef = useRef<LastUser | null>(null);
  // 同時に何本も 401 が返っても、画面を戻すのは1回だけにする
  const redirectingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadAuthToken(), loadLastUser()]).then(([token, storedUser]) => {
      if (cancelled) return;
      setAuthToken(token);
      setHasToken(token !== null);
      lastUserRef.current = storedUser;
      setLastUser(storedUser);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const forgetToken = useCallback(() => {
    setAuthToken(null);
    setHasToken(false);
    void clearAuthToken();
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setSessionErrorHandler((error) => {
      if (error.code === 'owner_only') {
        // 役割が変わったかもしれないので取り直し、管理者画面を閉じる
        void queryClient.invalidateQueries({ queryKey: authKeys.me() });
        if (router.canDismiss()) router.dismissAll();
        router.replace('/(tabs)');
        Alert.alert('管理者だけが使えます');
        return;
      }
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      forgetToken();
      if (error.code === 'invalid_token') {
        // 停止された人など。覚えていたログイン情報を消して最初から
        lastUserRef.current = null;
        setLastUser(null);
        void clearLastUser();
      }
      goToLogin(lastUserRef.current);
    });
    return () => setSessionErrorHandler(null);
  }, [forgetToken, queryClient]);

  const rememberUser = useCallback(async (me: Me) => {
    const remembered = toLastUser(me);
    lastUserRef.current = remembered;
    setLastUser(remembered);
    await saveLastUser(remembered);
  }, []);

  const signIn = useCallback(
    async (userId: number, pin: string) => {
      const { access_token: token } = await login(userId, pin);
      setAuthToken(token);
      await saveAuthToken(token);
      const me = await fetchMe();
      queryClient.setQueryData(authKeys.me(), me);
      await rememberUser(me);
      setHasToken(true);
      redirectingRef.current = false;
      return me;
    },
    [queryClient, rememberUser],
  );

  const signOut = useCallback(async () => {
    forgetToken();
    lastUserRef.current = null;
    setLastUser(null);
    await clearLastUser();
  }, [forgetToken]);

  const value = useMemo(
    () => ({ ready, hasToken, lastUser, signIn, signOut, rememberUser }),
    [hasToken, lastUser, ready, rememberUser, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

/**
 * ログイン中の人（GET /auth/me）。ログイン後の画面では、起動時か PIN 画面で取ってから移るので入っている。
 * 取り直している最中などに undefined になることがあるので、role は `user?.role ?? 'worker'` のように使う。
 */
export function useCurrentUser(): Me | undefined {
  const { hasToken } = useAuth();
  return useMeQuery(hasToken).data;
}

