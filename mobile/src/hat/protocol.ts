// 帽子（Pi）とのやり取りの形。帽子の要件（2026-10-05）の「やり取りの一覧」どおり。
// 文字のメッセージは JSON、写真と音声はバイナリで、先頭1バイトの印で中身を見分ける。

export const HAT_PORT = 5000;
export const HAT_PATH = '/events';
/** ping を送る間隔 */
export const PING_INTERVAL_MS = 2000;
/** 相手から何も届かなければ切断とみなす時間 */
export const DEAD_AFTER_MS = 5000;
/** 鳴らし終わってから、帽子が判定中（「これ」を聞く状態）を続ける時間 */
export const JUDGE_MODE_MS = 15000;
/** 帽子から届くマイクの音（16kHz・16bit・モノラル） */
export const MIC_SAMPLE_RATE = 16000;

export type HatEvent =
  | { event: 'judge' }
  | { event: 'talk' }
  | { event: 'played'; id: number; stopped?: boolean }
  | { event: 'ping' };

export type HatCommand =
  | { cmd: 'play'; id: number }
  | { cmd: 'stop' }
  | { cmd: 'volume'; level: number }
  | { cmd: 'listen' }
  | { cmd: 'listen_stop' }
  | { cmd: 'ping' };

export type HatBinary = { kind: 'jpeg' | 'audio'; data: Uint8Array };

const MARK_JPEG = 0x4a; // J
const MARK_AUDIO = 0x41; // A
const MARK_WAV = 0x57; // W

export function hatUrl(ip: string): string {
  return `ws://${ip.trim()}:${HAT_PORT}${HAT_PATH}`;
}

/** 帽子からの JSON。表にないものは null */
export function parseEvent(text: string): HatEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value == null) return null;
  const message = value as Record<string, unknown>;
  switch (message.event) {
    case 'judge':
    case 'talk':
    case 'ping':
      return { event: message.event };
    case 'played':
      if (typeof message.id !== 'number') return null;
      return { event: 'played', id: message.id, stopped: message.stopped === true };
    default:
      return null;
  }
}

/** 帽子からのバイナリ。印が J か A でなければ null */
export function parseBinary(buffer: ArrayBuffer): HatBinary | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 1) return null;
  const data = bytes.subarray(1);
  if (bytes[0] === MARK_JPEG) return { kind: 'jpeg', data };
  if (bytes[0] === MARK_AUDIO) return { kind: 'audio', data };
  return null;
}

/** 鳴らす wav の前に印 W を付ける */
export function wavFrame(wav: Uint8Array): ArrayBuffer {
  const frame = new Uint8Array(wav.length + 1);
  frame[0] = MARK_WAV;
  frame.set(wav, 1);
  return frame.buffer;
}
