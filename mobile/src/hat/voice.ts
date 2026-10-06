// 帽子で鳴らす声。AWS（Amazon Polly の Kazuha）でつくり、同じ文と速さは端末に取っておく。
// 決まった言葉は帽子につないだときに先につくっておく。AWS につながらないときは端末の読み上げを使う。

import { File } from 'expo-file-system';

import { createSpeech, type SpeechSpeedKey } from '@/api/speech';
import { SPEECH_RATES, TextToSpeech } from '@/native';
import { loadSettings, type SpeechSpeed } from '@/storage/settings';

const speedKeys: Record<SpeechSpeed, SpeechSpeedKey> = {
  はやい: 'fast',
  ふつう: 'normal',
  ゆっくり: 'slow',
  すごくゆっくり: 'verySlow',
};

const deviceRates: Record<SpeechSpeedKey, number> = {
  fast: SPEECH_RATES.fast,
  normal: SPEECH_RATES.normal,
  slow: SPEECH_RATES.slow,
  verySlow: SPEECH_RATES.verySlow,
};

/** 先につくっておく言葉（docs/voice-wording.md の答えと、決まった案内） */
export const FIXED_PHRASES = [
  '取ってください',
  '残してください',
  'どちらか1つ取ってください',
  'どれか1つ取ってください',
  'ハサミの先が見えません。もう一度お願いします',
  'この辺りは終わりです',
  'この辺りは大丈夫です',
  'うまく判定できませんでした。もう一度お願いします',
  'うまく聞き取れませんでした。もう一度お願いします',
  '相談につながりません',
];

const MAX_CACHED = 200;
const cache = new Map<string, Uint8Array>();

async function currentSpeed(): Promise<SpeechSpeedKey> {
  return speedKeys[(await loadSettings()).speechSpeed];
}

function remember(key: string, wav: Uint8Array) {
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
  cache.set(key, wav);
}

export type Voice = { wav: Uint8Array; source: 'cache' | 'aws' | 'device' };

/** 文の wav。取っておいたもの → AWS → 端末の読み上げ の順に使う */
export async function voiceFor(text: string): Promise<Voice> {
  const speed = await currentSpeed();
  const key = `${speed}:${text}`;
  const cached = cache.get(key);
  if (cached) return { wav: cached, source: 'cache' };
  try {
    const wav = await createSpeech(text, speed);
    remember(key, wav);
    return { wav, source: 'aws' };
  } catch {
    const { wavPath } = await TextToSpeech.synthesize(text, { rate: deviceRates[speed] });
    const uri = wavPath.startsWith('file://') ? wavPath : `file://${wavPath}`;
    return { wav: await new File(uri).bytes(), source: 'device' };
  }
}

/** 決まった言葉を今の速さで先につくっておく。つくれた数を返す */
export async function prepareFixedPhrases(): Promise<number> {
  const speed = await currentSpeed();
  let made = 0;
  for (const text of FIXED_PHRASES) {
    const key = `${speed}:${text}`;
    if (cache.has(key)) {
      made++;
      continue;
    }
    try {
      remember(key, await createSpeech(text, speed));
      made++;
    } catch {
      // AWS につながらないときは、使うときに端末の読み上げで代わりにつくる
    }
  }
  return made;
}
