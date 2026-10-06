// 画面からはここだけを読み込む。ネイティブ部品が無い環境では仮実装に切り替わる。
import { requireOptionalNativeModule } from 'expo';

import { DummyFruitDetector, DummySpeechToText, DummyTextToSpeech } from './dummy';
import {
  isNativeError,
  type DetectionResult,
  type FruitDetectorApi,
  type JudgeAnswer,
  type NativeError,
  type SpeechToTextApi,
  type SynthesizeResult,
  type TextToSpeechApi,
  type TranscribeResult,
} from './types';

export * from './types';

type FruitDetectorNativeModule = {
  load(): Promise<void>;
  unload(): Promise<void>;
  captureAndDetect(hatBaseUrl: string, timeoutMs: number): Promise<DetectionResult>;
  detectFile(path: string): Promise<DetectionResult>;
  sampleImagePath(): Promise<string | null>;
  judgeFile(path: string, judging: boolean): Promise<JudgeAnswer>;
};

type SttNativeModule = {
  load(): Promise<void>;
  unload(): Promise<void>;
  transcribe(wavPath: string): Promise<TranscribeResult>;
  startRecording(wavPath: string): Promise<void>;
  stopRecording(): Promise<{ durationMs: number }>;
};

type TtsNativeModule = {
  synthesize(text: string, rate: number): Promise<SynthesizeResult>;
};

const fruitNative = requireOptionalNativeModule<FruitDetectorNativeModule>('PammitFruitDetector');
const sttNative = requireOptionalNativeModule<SttNativeModule>('PammitStt');
const ttsNative = requireOptionalNativeModule<TtsNativeModule>('PammitTts');

// ネイティブのエラーを決められたコードにそろえる
function toNativeError(error: unknown): NativeError {
  if (isNativeError(error)) return error;
  const message = error instanceof Error ? error.message : String(error);
  return Object.assign(new Error(message), { code: 'UNKNOWN' as const });
}

async function call<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw toNativeError(error);
  }
}

// 帽子からの撮影を待つ時間の既定値
const DEFAULT_CAPTURE_TIMEOUT_MS = 3000;

export const FruitDetector: FruitDetectorApi = fruitNative
  ? {
      load: () => call(() => fruitNative.load()),
      unload: () => call(() => fruitNative.unload()),
      captureAndDetect: (hatBaseUrl, opts) =>
        call(() => fruitNative.captureAndDetect(hatBaseUrl, opts?.timeoutMs ?? DEFAULT_CAPTURE_TIMEOUT_MS)),
      detectFile: (path) => call(() => fruitNative.detectFile(path)),
      sampleImagePath: () => call(() => fruitNative.sampleImagePath()),
      judgeFile: (path, judging) => call(() => fruitNative.judgeFile(path, judging)),
    }
  : DummyFruitDetector;

export const SpeechToText: SpeechToTextApi = sttNative
  ? {
      load: () => call(() => sttNative.load()),
      unload: () => call(() => sttNative.unload()),
      transcribe: (wavPath) => call(() => sttNative.transcribe(wavPath)),
      startRecording: (wavPath) => call(() => sttNative.startRecording(wavPath)),
      stopRecording: () => call(() => sttNative.stopRecording()),
    }
  : DummySpeechToText;

export const TextToSpeech: TextToSpeechApi = ttsNative
  ? {
      synthesize: (text, opts) => call(() => ttsNative.synthesize(text, opts?.rate ?? 1)),
    }
  : DummyTextToSpeech;

/** 実機のネイティブ部品が使われているか（開発画面の表示用） */
export const nativeAvailability = {
  fruitDetector: fruitNative != null,
  speechToText: sttNative != null,
  textToSpeech: ttsNative != null,
} as const;
