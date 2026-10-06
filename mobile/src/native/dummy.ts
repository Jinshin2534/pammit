// ネイティブ部品が使えない環境（Webなど）で動かすための仮実装。固定値を少し待ってから返す。
import {
  createNativeError,
  type DetectedObject,
  type DetectionResult,
  type FruitDetectorApi,
  type SpeechToTextApi,
  type TextToSpeechApi,
} from './types';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let detectorLoaded = false;
let frameCount = 0;

// 仮の検出結果（帽子の撮影もファイルも同じ内容を返す）
function dummyResult(captureMs: number): DetectionResult {
  frameCount += 1;
  return {
    frameId: `dummy-${String(frameCount).padStart(4, '0')}`,
    capturedAt: new Date().toISOString(),
    imageWidth: 1280,
    imageHeight: 720,
    modelVersion: 'dummy-0.0.0',
    objects: [
      fruit('obj-1', [0.18, 0.32, 0.12, 0.2], 0.91, 0.08),
      fruit('obj-2', [0.52, 0.4, 0.1, 0.17], 0.84, 0.86),
      fruit('obj-3', [0.71, 0.22, 0.09, 0.15], 0.63, 0.45),
      fruit('obj-4', [0.9, 0.6, 0.01, 0.02], 0.41, null),
    ],
    timingMs: { capture: captureMs, decode: 40, detect: 220, observe: 60 },
  };
}

function fruit(
  id: string,
  bbox: DetectedObject['bbox'],
  score: number,
  shadeProbability: number | null,
): DetectedObject {
  if (shadeProbability == null) {
    return { id, class: 'fruit', bbox, score, light: 'unknown', shadeProbability, lightReason: 'fruit_too_small', leafCover: null };
  }
  const light = shadeProbability >= 0.7 ? 'mostly_shaded' : shadeProbability <= 0.2 ? 'not_mostly_shaded' : 'unknown';
  return { id, class: 'fruit', bbox, score, light, shadeProbability, lightReason: null, leafCover: null };
}

export const DummyFruitDetector: FruitDetectorApi = {
  async load() {
    await wait(300);
    detectorLoaded = true;
  },
  async unload() {
    detectorLoaded = false;
  },
  async captureAndDetect(hatBaseUrl, opts) {
    if (!detectorLoaded) throw createNativeError('MODEL_NOT_LOADED', '果実検出モデルが読み込まれていません');
    const timeoutMs = opts?.timeoutMs ?? 3000;
    if (timeoutMs < 600) {
      await wait(timeoutMs);
      throw createNativeError('TIMEOUT', `${hatBaseUrl} からの撮影が時間内に終わりませんでした`);
    }
    await wait(600);
    return dummyResult(210);
  },
  async detectFile() {
    if (!detectorLoaded) throw createNativeError('MODEL_NOT_LOADED', '果実検出モデルが読み込まれていません');
    await wait(400);
    return dummyResult(0);
  },
  async sampleImagePath() {
    return null;
  },
  async judgeFile(_path, judging) {
    if (!detectorLoaded) throw createNativeError('MODEL_NOT_LOADED', '判定モデルが読み込まれていません');
    await wait(700);
    return {
      say: judging ? '残してください' : 'この辺りは大丈夫です',
      why: null,
      scene: judging ? 'other' : 'guide',
      mode: judging ? 'touch' : 'guide',
      verdict: judging ? 'keep' : null,
      fruits: 2,
      shadedFruits: 1,
      imageWidth: 1280,
      imageHeight: 720,
      timingMs: { total: 700 },
    };
  },
};

let sttLoaded = false;

export const DummySpeechToText: SpeechToTextApi = {
  async load() {
    await wait(500);
    sttLoaded = true;
  },
  async unload() {
    sttLoaded = false;
  },
  async transcribe(wavPath) {
    if (!sttLoaded) throw createNativeError('MODEL_NOT_LOADED', '音声認識モデルが読み込まれていません');
    if (!wavPath) throw createNativeError('INVALID_AUDIO', '音声ファイルが指定されていません');
    await wait(400);
    return { text: 'パミット、これ？', durationMs: 1800 };
  },
  async startRecording() {
    await wait(100);
  },
  async stopRecording() {
    await wait(100);
    return { durationMs: 3000 };
  },
};

export const DummyTextToSpeech: TextToSpeechApi = {
  async synthesize(text, opts) {
    await wait(300);
    const rate = opts?.rate ?? 1;
    // 1文字あたり約150msとして長さを見積もる
    const durationMs = Math.round((text.length * 150) / rate);
    return { wavPath: '/dummy/cache/tts-dummy.wav', durationMs };
  },
};
