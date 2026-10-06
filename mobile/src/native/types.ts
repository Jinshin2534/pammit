// 端末内で動くネイティブ処理（果実検出・音声認識・音声合成）の型。

export const NATIVE_ERROR_CODES = [
  'HAT_UNREACHABLE',
  'TIMEOUT',
  'MODEL_NOT_LOADED',
  'MODEL_LOAD_FAILED',
  'INVALID_AUDIO',
  'TTS_UNAVAILABLE',
  'UNKNOWN',
] as const;

export type NativeErrorCode = (typeof NATIVE_ERROR_CODES)[number];

export type NativeError = Error & { code: NativeErrorCode };

export function isNativeError(error: unknown): error is NativeError {
  if (!(error instanceof Error)) return false;
  const code: unknown = (error as { code?: unknown }).code;
  return typeof code === 'string' && (NATIVE_ERROR_CODES as readonly string[]).includes(code);
}

export function createNativeError(code: NativeErrorCode, message: string): NativeError {
  return Object.assign(new Error(message), { code });
}

// 読み上げ速度の目安（仮の値）
export const SPEECH_RATES = { fast: 1.25, normal: 1.0, slow: 0.85, verySlow: 0.7 } as const;

export type SpeechRateName = keyof typeof SPEECH_RATES;

export type FruitClass = 'fruit' | 'leaf';
/** 見えている果面の7割以上が陰か。果実以外は null */
export type FruitLight = 'mostly_shaded' | 'not_mostly_shaded' | 'unknown';
/** 陰の判定をしなかった理由（小さすぎる実は判定しない） */
export type FruitLightReason = 'fruit_too_small';

export type DetectedObject = {
  id: string;
  class: FruitClass;
  /** 画像サイズで割った x, y, w, h（0〜1） */
  bbox: [number, number, number, number];
  score: number;
  light: FruitLight | null;
  /** 陰である確率（0〜1）。判定しなかったときは null */
  shadeProbability: number | null;
  lightReason: FruitLightReason | null;
  /** 葉のかぶりは未対応。常に null */
  leafCover: null;
};

export type DetectionResult = {
  frameId: string;
  /** ISO 8601（時差つき） */
  capturedAt: string;
  /** EXIF の向きを反映した元画像の大きさ */
  imageWidth: number;
  imageHeight: number;
  modelVersion: string;
  objects: DetectedObject[];
  /** 撮影（帽子からの取得）・JPEGの読み込み・検出・陰の判定にかかった時間 */
  timingMs: { capture: number; decode: number; detect: number; observe: number };
};

/** 判定の進み方。touch: 触れた葉か実に答えた / guide: 案内モードを始めた / retake: 撮り直しを頼んだ */
export type JudgeMode = 'touch' | 'guide' | 'retake';

export type JudgeAnswer = {
  /** 帽子で鳴らす言葉 */
  say: string;
  /** 「なんで？」と聞かれたときの理由。無いときは null */
  why: string | null;
  /** 場面（contact・above_shaded・fruit_pair など。docs/voice-wording.md の表に対応） */
  scene: string;
  mode: JudgeMode;
  /** 触れたものへの答え。取って → cut、残して → keep。touch 以外は null */
  verdict: 'cut' | 'keep' | null;
  fruits: number;
  shadedFruits: number;
  imageWidth: number;
  imageHeight: number;
  timingMs: Record<string, number>;
};

export type CaptureOptions = { timeoutMs?: number };

export type TranscribeResult = { text: string; durationMs: number };

export type SynthesizeOptions = { rate?: number };

export type SynthesizeResult = { wavPath: string; durationMs: number };

export type FruitDetectorApi = {
  load(): Promise<void>;
  unload(): Promise<void>;
  captureAndDetect(hatBaseUrl: string, opts?: CaptureOptions): Promise<DetectionResult>;
  /** 端末内の JPEG で同じ処理を行う（帽子なしでの確認用） */
  detectFile(path: string): Promise<DetectionResult>;
  /** 同梱の試験用写真のパス。無ければ null */
  sampleImagePath(): Promise<string | null>;
  /** 帽子の1枚に取る／残すを答える。judging は帽子の判定中（最後の音声を鳴らし終えてから15秒以内）なら true */
  judgeFile(path: string, judging: boolean): Promise<JudgeAnswer>;
};

export type SpeechToTextApi = {
  load(): Promise<void>;
  unload(): Promise<void>;
  transcribe(wavPath: string): Promise<TranscribeResult>;
};

export type TextToSpeechApi = {
  synthesize(text: string, opts?: SynthesizeOptions): Promise<SynthesizeResult>;
};
