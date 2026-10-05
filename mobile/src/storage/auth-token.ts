// ログインのトークンは端末の安全な領域（SecureStore）に置く。PIN は保存しない。
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'pammit.auth-token';

export async function loadAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // 保存できなくても、このあいだはメモリ上のトークンで使える
  }
}

export async function clearAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // 消せなかったときは次の起動で 401 になり、ログインし直す
  }
}
