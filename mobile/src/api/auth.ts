// 認証・利用者の API。リソースごとに「キー → 関数 → フック」の順で置く（手本。README の「API のつなぎ方」）。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appConfig } from '@/config/app';

import { apiRequest } from './client';
import type { LoginCandidate, Me, MeUpdate, Role, TokenResponse } from './types';

// ---- キー（invalidateQueries / setQueryData で使う） ----

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  loginCandidates: (role?: Role) => [...authKeys.all, 'login-candidates', appConfig.farmCode, role ?? 'all'] as const,
};

// ---- 関数（画面からは直接呼ばず、フックか providers から呼ぶ） ----

export function fetchLoginCandidates(role?: Role, signal?: AbortSignal) {
  return apiRequest<LoginCandidate[]>('/auth/users', {
    auth: false,
    query: { farm_code: appConfig.farmCode, role },
    signal,
  });
}

export function login(userId: number, pin: string) {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { farm_code: appConfig.farmCode, user_id: userId, pin },
  });
}

export function fetchMe(signal?: AbortSignal) {
  return apiRequest<Me>('/auth/me', { signal });
}

export function updateMe(body: MeUpdate) {
  return apiRequest<Me>('/users/me', { method: 'PATCH', body });
}

// ---- フック ----

/** ログイン画面の名前の一覧 */
export function useLoginCandidates(role: Role) {
  return useQuery({
    queryKey: authKeys.loginCandidates(role),
    queryFn: ({ signal }) => fetchLoginCandidates(role, signal),
    staleTime: 0,
  });
}

/**
 * ログイン中の人。画面では providers/auth の useCurrentUser() を使う。
 * enabled はトークンがあるときだけ true にする。
 */
export function useMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: ({ signal }) => fetchMe(signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** プロフィール（名前・アイコン）を保存する。成功したらログイン中の人を書き換える */
export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMe,
    onSuccess: (me) => queryClient.setQueryData(authKeys.me(), me),
  });
}
