// 作業者の API（管理者）。削除は PATCH { active: false }（停止）で行う。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiRequest } from './client';
import type { UserCreate, UserOut, UserUpdate, UserWithPin } from './types';

// ---- キー ----

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  /** 登録で返った PIN。画面遷移のパラメータに載せず、このキャッシュで登録完了の画面へ渡す */
  issuedPin: () => [...userKeys.all, 'issued-pin'] as const,
};

// ---- 関数 ----

export function fetchUsers(signal?: AbortSignal) {
  return apiRequest<UserOut[]>('/users', { signal });
}

export function createUser(body: UserCreate) {
  return apiRequest<UserWithPin>('/users', { method: 'POST', body });
}

export function updateUser(id: number, body: UserUpdate) {
  return apiRequest<UserOut>(`/users/${id}`, { method: 'PATCH', body });
}

// ---- フック ----

/** 作業者の一覧。owner と停止中の人も入っているので、画面で絞る */
export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: ({ signal }) => fetchUsers(signal),
  });
}

/** 作業者を登録する。返った PIN は userKeys.issuedPin() に置く（useIssuedPin で読む） */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: (result) => {
      queryClient.setQueryData(userKeys.issuedPin(), result);
      return queryClient.invalidateQueries({ queryKey: userKeys.list() });
    },
  });
}

/** 作業者を変える。停止（削除）も { active: false } でこれを使う */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UserUpdate }) => updateUser(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.list() }),
  });
}

/** 最後に発行した PIN（端末には残さない）。登録完了の画面で一度だけ出す */
export function useIssuedPin() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: userKeys.issuedPin(),
    queryFn: () => null as UserWithPin | null,
    enabled: false,
    initialData: null,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const clear = useCallback(() => queryClient.removeQueries({ queryKey: userKeys.issuedPin() }), [queryClient]);
  return { issued: data, clear };
}
