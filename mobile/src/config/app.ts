// 接続先は EXPO_PUBLIC_API_BASE_URL で切り替える（開発中はローカルのバックエンド）。
// 例: EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 npx expo start --dev-client
const defaultApiBaseUrl = 'https://13-192-68-51.sslip.io/api/v1';

export const appConfig = {
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL || defaultApiBaseUrl).replace(/\/+$/, ''),
  farmCode: 'kamiyama-01',
  /** ふつうの API の待ち時間（ミリ秒） */
  requestTimeoutMs: 15_000,
  /** AI 相談の待ち時間（ミリ秒） */
  aiRequestTimeoutMs: 60_000,
} as const;
