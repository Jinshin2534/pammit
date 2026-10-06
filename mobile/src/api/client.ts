// fetch はこのファイルだけで使う。リソースごとの関数（auth.ts など）から apiRequest を呼ぶ。
import { appConfig } from '@/config/app';

import { ApiError, ApiErrorDetail } from './errors';

type QueryValue = string | number | boolean | null | undefined;

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** undefined と null の値は送らない */
  query?: Record<string, QueryValue>;
  /** JSON で送る本文。FormData のときは multipart/form-data で送る */
  body?: unknown;
  /** 待ち時間（ミリ秒）。既定は appConfig.requestTimeoutMs。AI 相談は appConfig.aiRequestTimeoutMs */
  timeoutMs?: number;
  /** false でトークンを付けない（ログイン前の API） */
  auth?: boolean;
  /** TanStack Query の queryFn に渡される signal をそのまま渡す */
  signal?: AbortSignal;
  /** bytes で本文をそのまま Uint8Array で返す（音声など） */
  responseType?: 'json' | 'bytes';
};

/** ログインが切れた・権限がないときに、アプリ全体で画面を戻すためのエラー */
export const sessionErrorCodes = ['token_expired', 'invalid_token', 'not_logged_in', 'owner_only'] as const;
export type SessionErrorCode = (typeof sessionErrorCodes)[number];

let authToken: string | null = null;
let sessionErrorHandler: ((error: ApiError & { code: SessionErrorCode }) => void) | null = null;

/** 保存したトークンを読み込んだとき・ログインしたとき・ログアウトしたときに呼ぶ */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/** AuthProvider が登録する。token_expired などを受けたら画面を戻す */
export function setSessionErrorHandler(handler: typeof sessionErrorHandler) {
  sessionErrorHandler = handler;
}

function isSessionError(error: ApiError): error is ApiError & { code: SessionErrorCode } {
  return (sessionErrorCodes as readonly string[]).includes(error.code);
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const search = Object.entries(query ?? {})
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${appConfig.apiBaseUrl}${path}${search ? `?${search}` : ''}`;
}

async function readError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // JSON でない応答（プロキシのエラーページなど）
  }
  const error = (body as { error?: { code?: unknown; message?: unknown; detail?: unknown } } | null)?.error;
  return new ApiError({
    status: response.status,
    code: typeof error?.code === 'string' ? error.code : `http_${response.status}`,
    message: typeof error?.message === 'string' ? error.message : 'サーバーでエラーが起きました',
    detail: error?.detail && typeof error.detail === 'object' ? (error.detail as ApiErrorDetail) : null,
  });
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, timeoutMs = appConfig.requestTimeoutMs, auth = true, signal, responseType = 'json' } = options;

  // 呼び出し元の取り消し（画面を離れたなど）と時間切れを1つの signal にまとめる
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abortFromCaller);

  const headers: Record<string, string> = { Accept: responseType === 'bytes' ? '*/*' : 'application/json' };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (cause) {
    if (timedOut) {
      throw new ApiError({ status: 0, code: 'timeout', message: '通信に時間がかかっています。電波のよい場所でもう一度お試しください' });
    }
    // 呼び出し元が取り消したときは、そのまま投げる（TanStack Query が扱う）
    if (signal?.aborted) throw cause;
    throw new ApiError({ status: 0, code: 'network_error', message: '通信が切れています' });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }

  if (!response.ok) {
    const error = await readError(response);
    if (auth && isSessionError(error)) sessionErrorHandler?.(error);
    throw error;
  }
  if (response.status === 204) return undefined as T;
  if (responseType === 'bytes') return new Uint8Array(await response.arrayBuffer()) as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
