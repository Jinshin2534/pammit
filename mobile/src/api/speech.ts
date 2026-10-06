// 帽子で鳴らす声の API。
import { apiRequest } from './client';

/** アプリの「話す速さ」に対応する速さ */
export type SpeechSpeedKey = 'fast' | 'normal' | 'slow' | 'verySlow';

/** 文を読み上げた wav（16kHz・16bit・モノラル）。つくれないときは 503 speech_unavailable */
export function createSpeech(text: string, speed: SpeechSpeedKey) {
  return apiRequest<Uint8Array>('/speech', {
    method: 'POST',
    body: { text, speed },
    responseType: 'bytes',
    timeoutMs: 8000,
  });
}
