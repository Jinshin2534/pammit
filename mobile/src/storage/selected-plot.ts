// 農園画面で選んだ農地。次に開いたときも同じ農地を出す。
import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_PLOT_KEY = 'pammit.selected-plot.v1';

export async function loadSelectedPlotId(): Promise<number | null> {
  try {
    const stored = await AsyncStorage.getItem(SELECTED_PLOT_KEY);
    const id = stored ? Number(stored) : NaN;
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}

/** null で忘れる */
export async function saveSelectedPlotId(id: number | null): Promise<void> {
  try {
    if (id === null) await AsyncStorage.removeItem(SELECTED_PLOT_KEY);
    else await AsyncStorage.setItem(SELECTED_PLOT_KEY, String(id));
  } catch {
    // 覚えられなくても、次は一覧の先頭を出す
  }
}
