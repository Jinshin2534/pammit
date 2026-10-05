// 音量・話す速さなど、端末ごとの設定。
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SpeechSpeed = 'はやい' | 'ふつう' | 'ゆっくり' | 'すごくゆっくり';

export type AppSettings = {
  /** 0〜100 */
  volume: number;
  speechSpeed: SpeechSpeed;
};

export const defaultSettings: AppSettings = { volume: 65, speechSpeed: 'ふつう' };

const SETTINGS_KEY = 'pammit.settings.v1';
const speeds: readonly SpeechSpeed[] = ['はやい', 'ふつう', 'ゆっくり', 'すごくゆっくり'];

export async function loadSettings(): Promise<AppSettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaultSettings;
    const parsed = JSON.parse(stored) as Partial<AppSettings>;
    return {
      volume: typeof parsed.volume === 'number' ? Math.min(100, Math.max(0, parsed.volume)) : defaultSettings.volume,
      speechSpeed: parsed.speechSpeed && speeds.includes(parsed.speechSpeed) ? parsed.speechSpeed : defaultSettings.speechSpeed,
    };
  } catch {
    return defaultSettings;
  }
}

/** 一部だけ変える。保存できたら true */
export async function saveSettings(patch: Partial<AppSettings>): Promise<boolean> {
  try {
    const current = await loadSettings();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }));
    return true;
  } catch {
    return false;
  }
}
