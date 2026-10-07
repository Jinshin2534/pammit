// API のエラーはすべて ApiError にそろえる。
// サーバーの形は {"error": {"code", "message", "detail"}}。
// 通信できなかったときは status 0 で、code は network_error か timeout。

/** サーバーへ届かなかったときの code */
export type ClientErrorCode = 'network_error' | 'timeout';

export type ApiErrorDetail = Record<string, unknown> | null;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: ApiErrorDetail;

  constructor({ status, code, message, detail = null }: { status: number; code: string; message: string; detail?: ApiErrorDetail }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }

  /** 通信が切れている・サーバーへ届かない・時間切れ */
  get isOffline() {
    return this.status === 0;
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

/** 通信が切れていて送れなかったか。「この機能には通信が必要です」を出す判断に使う */
export function isOfflineError(error: unknown): boolean {
  return error instanceof ApiError && error.isOffline;
}

export const offlineMessage = 'この機能には通信が必要です';

/** 画面に出す文。通信が切れているときは決まった文、それ以外はサーバーの message */
export function errorMessage(error: unknown, fallback = 'うまくいきませんでした。もう一度お試しください'): string {
  if (isOfflineError(error)) return offlineMessage;
  if (error instanceof ApiError && error.message) return error.message;
  return fallback;
}
