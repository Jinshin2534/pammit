// ベテランAI相談の API。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appConfig } from '@/config/app';

import { apiRequest } from './client';
import type { ChatMessage, ChatThread } from './types';

// ---- キー ----

export const chatKeys = {
  all: ['chat'] as const,
  threads: () => [...chatKeys.all, 'threads'] as const,
  messages: (threadId: number) => [...chatKeys.all, 'threads', threadId, 'messages'] as const,
};

/** 1回の質問の上限（文字） */
export const chatMessageMaxLength = 2000;

// ---- 関数 ----

/** 過去の会話。最後に話した順に100件。作業中の会話も混ざる */
export function fetchChatThreads(signal?: AbortSignal) {
  return apiRequest<ChatThread[]>('/chat/threads', { signal });
}

/** 会話を始める。作業中なら sessionId を付ける */
export function createChatThread(sessionId?: number | null) {
  return apiRequest<ChatThread>('/chat/threads', { method: 'POST', body: { session_id: sessionId ?? null } });
}

export function fetchChatMessages(threadId: number, signal?: AbortSignal) {
  return apiRequest<ChatMessage[]>(`/chat/threads/${threadId}/messages`, { signal });
}

/** 質問を送り、AI の答えを受け取る。AI が使えないときは 503 ai_unavailable */
export function postChatMessage(threadId: number, content: string) {
  return apiRequest<ChatMessage>(`/chat/threads/${threadId}/messages`, {
    method: 'POST',
    body: { content, mode: 'text' },
    timeoutMs: appConfig.aiRequestTimeoutMs,
  });
}

// ---- フック ----

export function useChatThreads() {
  return useQuery({
    queryKey: chatKeys.threads(),
    queryFn: ({ signal }) => fetchChatThreads(signal),
  });
}

export function useChatMessages(threadId: number | null) {
  return useQuery({
    queryKey: chatKeys.messages(threadId ?? 0),
    queryFn: ({ signal }) => fetchChatMessages(threadId as number, signal),
    enabled: threadId !== null,
    staleTime: Infinity,
  });
}

type SendChatInput = {
  /** 続ける会話。null なら新しく始める */
  threadId: number | null;
  /** 作業中の相談なら作業ID */
  sessionId?: number | null;
  content: string;
  /** 会話を作れたら呼ぶ（答えが失敗しても、同じ会話へ送り直せるようにする） */
  onThreadCreated?: (thread: ChatThread) => void;
};

/**
 * 質問を送る。会話がまだなければ先に作る。
 * 成功したら質問と答えを会話の中身に足し、過去の会話を取り直す。
 */
export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, sessionId, content, onThreadCreated }: SendChatInput) => {
      let id = threadId;
      if (id === null) {
        const thread = await createChatThread(sessionId);
        id = thread.id;
        onThreadCreated?.(thread);
      }
      const answer = await postChatMessage(id, content);
      return { threadId: id, answer };
    },
    onSuccess: ({ threadId, answer }, { content }) => {
      const question: ChatMessage = { id: -answer.id, role: 'user', content, created_at: answer.created_at };
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(threadId), (current) => [...(current ?? []), question, answer]);
      void queryClient.invalidateQueries({ queryKey: chatKeys.threads() });
    },
  });
}
