// 帽子への WebSocket 1本。スマホからつなぎに行き、切れたらつなぎ直す。
// 2秒ごとに ping を送り、5秒何も届かなければ切断とみなす。

import {
  DEAD_AFTER_MS,
  PING_INTERVAL_MS,
  hatUrl,
  parseBinary,
  parseEvent,
  wavFrame,
  type HatBinary,
  type HatCommand,
  type HatEvent,
} from './protocol';

export type HatConnection = 'disconnected' | 'connecting' | 'connected';

export type HatClientHandlers = {
  onEvent(event: HatEvent): void;
  onBinary(binary: HatBinary): void;
  onConnection(state: HatConnection): void;
  onLog?(message: string): void;
};

const RECONNECT_DELAY_MS = 1000;

export class HatClient {
  private socket: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastReceivedAt = 0;
  private stopped = true;
  state: HatConnection = 'disconnected';

  constructor(private handlers: HatClientHandlers) {}

  /** ip へつなぐ。つながるまで（止めるまで）つなぎ直し続ける */
  start(ip: string) {
    this.stop();
    this.stopped = false;
    this.open(ip);
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.close();
  }

  send(command: HatCommand): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(command));
    return true;
  }

  /** {"cmd":"play","id"} の直後に W＋wav を送る */
  play(id: number, wav: Uint8Array): boolean {
    if (!this.send({ cmd: 'play', id })) return false;
    this.socket?.send(wavFrame(wav));
    return true;
  }

  private open(ip: string) {
    this.setState('connecting');
    const socket = new WebSocket(hatUrl(ip));
    socket.binaryType = 'arraybuffer';
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.lastReceivedAt = Date.now();
      this.setState('connected');
      this.log(`つながりました: ${hatUrl(ip)}`);
      this.pingTimer = setInterval(() => {
        if (Date.now() - this.lastReceivedAt > DEAD_AFTER_MS) {
          this.log('5秒何も届かないため、つなぎ直します');
          socket.close();
          return;
        }
        this.send({ cmd: 'ping' });
      }, PING_INTERVAL_MS);
    };

    socket.onmessage = (message) => {
      if (this.socket !== socket) return;
      this.lastReceivedAt = Date.now();
      if (typeof message.data === 'string') {
        const event = parseEvent(message.data);
        if (event) this.handlers.onEvent(event);
        else this.log(`知らないメッセージ: ${message.data.slice(0, 80)}`);
      } else if (message.data instanceof ArrayBuffer) {
        const binary = parseBinary(message.data);
        if (binary) this.handlers.onBinary(binary);
      }
    };

    socket.onerror = () => {
      if (this.socket === socket) this.log('接続でエラーが起きました');
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.close();
      if (this.stopped) return;
      this.reconnectTimer = setTimeout(() => this.open(ip), RECONNECT_DELAY_MS);
    };
  }

  private close() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState !== WebSocket.CLOSED) socket.close();
    this.setState('disconnected');
  }

  private setState(state: HatConnection) {
    if (this.state === state) return;
    this.state = state;
    this.handlers.onConnection(state);
  }

  private log(message: string) {
    this.handlers.onLog?.(message);
  }
}
