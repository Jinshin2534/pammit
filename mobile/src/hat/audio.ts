// 帽子のマイクの音（16kHz・16bit・モノラルの PCM）の扱い。話し終わりの見分けと wav への書き出し。

import { MIC_SAMPLE_RATE } from './protocol';

/** 0.1秒ごとの音の大きさ（RMS、0〜1） */
export function rms(pcm: Uint8Array): number {
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const samples = Math.floor(pcm.byteLength / 2);
  if (samples === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const v = view.getInt16(i * 2, true) / 32768;
    sum += v * v;
  }
  return Math.sqrt(sum / samples);
}

// 話していると見なす大きさ（仮の値。畑で試して決める）
const SPEECH_LEVEL = 0.02;
// 話したあと、これだけ黙ったら話し終わり
const END_SILENCE_MS = 800;
// 何も話さないまま、これだけ黙ったら相談おわり（帽子の要件の「5秒黙っていたら」）
const IDLE_SILENCE_MS = 5000;

export type VoiceState = 'waiting' | 'speaking' | 'ended' | 'idle';

/** 届いた音を順に入れ、話し終わり（ended）か、黙ったままの終わり（idle）を返す */
export class VoiceActivity {
  private chunks: Uint8Array[] = [];
  private heardSpeech = false;
  private silenceMs = 0;

  push(pcm: Uint8Array): VoiceState {
    this.chunks.push(pcm.slice());
    const ms = (pcm.byteLength / 2 / MIC_SAMPLE_RATE) * 1000;
    if (rms(pcm) >= SPEECH_LEVEL) {
      this.heardSpeech = true;
      this.silenceMs = 0;
      return 'speaking';
    }
    this.silenceMs += ms;
    if (this.heardSpeech && this.silenceMs >= END_SILENCE_MS) return 'ended';
    if (!this.heardSpeech && this.silenceMs >= IDLE_SILENCE_MS) return 'idle';
    return this.heardSpeech ? 'speaking' : 'waiting';
  }

  /** ここまでの音をまとめて返し、中身を空にする */
  take(): Uint8Array {
    const total = this.chunks.reduce((n, c) => n + c.byteLength, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      out.set(c, offset);
      offset += c.byteLength;
    }
    this.reset();
    return out;
  }

  reset() {
    this.chunks = [];
    this.heardSpeech = false;
    this.silenceMs = 0;
  }
}

/** PCM に wav のヘッダーを付ける */
export function pcmToWav(pcm: Uint8Array, sampleRate = MIC_SAMPLE_RATE): Uint8Array {
  const out = new Uint8Array(44 + pcm.byteLength);
  const view = new DataView(out.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // モノラル
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  out.set(pcm, 44);
  return out;
}
