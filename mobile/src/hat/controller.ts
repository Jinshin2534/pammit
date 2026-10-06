// 帽子とスマホの流れ。帽子の要件（2026-10-05）の「動きの流れ」どおり。
//   判定: judge → J＋JPEG → 端末内で判定 → 読み上げの wav → play
//   相談: talk → A＋音声 → 話し終わりで listen_stop → 文字起こし → 相談の API → wav → play
//         → 鳴らし終わったら listen。5秒黙っていたら listen_stop で終わり
// 帽子からは「お願い」と「これ」の区別が届かない。最後に鳴らし終えてから15秒以内（帽子の判定中）の
// judge を「これ」とみなして判定に渡す（ハサミの先が写っていなければ撮り直しを頼む）。

import { File, Paths } from 'expo-file-system';

import { createChatThread, postChatMessage } from '@/api/chat';
import { postDetections, type DetectionIn } from '@/api/work-sessions';
import { uuidV4 } from '@/lib/uuid';
import { FruitDetector, SpeechToText, type JudgeAnswer } from '@/native';
import { loadSettings } from '@/storage/settings';

import { pcmToWav, VoiceActivity } from './audio';
import { HatClient, type HatConnection } from './client';
import { JUDGE_MODE_MS, type HatBinary, type HatEvent } from './protocol';
import { prepareFixedPhrases, voiceFor } from './voice';

export type TalkPhase = 'off' | 'listening' | 'thinking' | 'speaking';

export type HatSnapshot = {
  connection: HatConnection;
  talk: TalkPhase;
  lastAnswer: JudgeAnswer | null;
  /** judge を受けてから wav を送り終えるまで */
  lastJudgeMs: number | null;
  lastTranscript: string | null;
  /** 作業に送った判定の数。増えたら作業中の画面が件数を読み直す */
  sentDetections: number;
  logs: string[];
};

const MAX_LOGS = 60;
// 判定の記録に残す、アプリに入れた判定の版（AI 側の 2026-10-06 版を移したもの）
const JUDGE_MODEL_VERSION = 'kore-judge-2026-10-06';

export class HatController {
  private client: HatClient;
  private listeners = new Set<(snapshot: HatSnapshot) => void>();
  private snapshot: HatSnapshot = {
    connection: 'disconnected',
    talk: 'off',
    lastAnswer: null,
    lastJudgeMs: null,
    lastTranscript: null,
    sentDetections: 0,
    logs: [],
  };
  private nextPlayId = 1;
  private lastPlayedAt = 0;
  private judgeStartedAt: number | null = null;
  private judging = false;
  private voice = new VoiceActivity();
  private talkReplyId: number | null = null;
  private chatThreadId: number | null = null;
  private loaded = false;
  private workSessionId: number | null = null;
  private unsentDetections: DetectionIn[] = [];

  constructor() {
    this.client = new HatClient({
      onEvent: (event) => this.onEvent(event),
      onBinary: (binary) => this.onBinary(binary),
      onConnection: (connection) => {
        this.update({ connection });
        if (connection === 'connected') {
          void this.sendVolume();
          void prepareFixedPhrases().then((n) => this.log(`決まった言葉の声を${n}個つくりました`));
        }
        if (connection === 'disconnected') this.endTalk();
      },
      onLog: (message) => this.log(message),
    });
  }

  subscribe(listener: (snapshot: HatSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  /** モデルを読み込んで帽子へつなぐ */
  async start(ip: string) {
    if (!this.loaded) {
      this.log('判定と音声認識のモデルを読み込みます');
      await Promise.all([FruitDetector.load(), SpeechToText.load()]);
      this.loaded = true;
      this.log('モデルを読み込みました');
    }
    this.client.start(ip);
  }

  stop() {
    this.client.stop();
  }

  /** 帽子を使う作業を始めたら呼ぶ。判定の件数と相談をその作業に記録する。終えたら null */
  setWorkSession(sessionId: number | null) {
    if (this.workSessionId === sessionId) return;
    this.workSessionId = sessionId;
    this.chatThreadId = null;
    this.unsentDetections = [];
  }

  /** 帽子で文を鳴らす（音声テストなど） */
  async say(text: string): Promise<void> {
    await this.speak(text);
  }

  private onEvent(event: HatEvent) {
    switch (event.event) {
      case 'judge':
        // 判定中に相談していたら、帽子は音声を止めて判定に移る
        this.endTalk();
        this.judgeStartedAt = Date.now();
        break;
      case 'talk':
        this.startTalk();
        break;
      case 'played':
        this.lastPlayedAt = Date.now();
        if (this.talkReplyId === event.id) {
          this.talkReplyId = null;
          if (this.snapshot.talk === 'speaking') {
            this.voice.reset();
            this.client.send({ cmd: 'listen' });
            this.update({ talk: 'listening' });
          }
        }
        break;
      case 'ping':
        break;
    }
  }

  private onBinary(binary: HatBinary) {
    if (binary.kind === 'jpeg') {
      if (this.judgeStartedAt == null) {
        this.log('judge の前に写真が届いたため捨てました');
        return;
      }
      void this.judge(binary.data);
    } else if (this.snapshot.talk === 'listening') {
      const state = this.voice.push(binary.data);
      if (state === 'ended') void this.answerTalk();
      if (state === 'idle') {
        this.log('5秒黙っていたので相談を終えます');
        this.endTalk();
      }
    }
  }

  private async judge(jpeg: Uint8Array) {
    const startedAt = this.judgeStartedAt ?? Date.now();
    this.judgeStartedAt = null;
    if (this.judging) {
      this.log('判定中に次の写真が届いたため捨てました');
      return;
    }
    this.judging = true;
    // 鳴らし終えてから15秒以内なら帽子は判定中（「これ」）
    const inJudgeMode = this.lastPlayedAt > 0 && startedAt - this.lastPlayedAt < JUDGE_MODE_MS;
    try {
      const file = new File(Paths.cache, 'hat-judge.jpg');
      file.write(jpeg);
      const answer = await FruitDetector.judgeFile(file.uri, inJudgeMode);
      this.update({ lastAnswer: answer });
      if (answer.mode === 'touch') this.record(answer.verdict === 'cut' ? 'take' : 'keep', answer.scene, answer.say);
      if (answer.mode === 'retake') this.record('unknown', answer.scene, answer.say);
      this.log(`判定（${inJudgeMode ? '判定中' : '最初'}）: ${answer.say}（${answer.scene}、${answer.timingMs.total ?? '?'} ms）`);
      await this.speak(answer.say);
      this.update({ lastJudgeMs: Date.now() - startedAt });
    } catch (error) {
      this.log(`判定に失敗しました: ${describe(error)}`);
      const said = 'うまく判定できませんでした。もう一度お願いします';
      this.record('unknown', 'judge_failed', said);
      await this.speak(said).catch(() => undefined);
    } finally {
      this.judging = false;
    }
  }

  private startTalk() {
    this.voice.reset();
    this.talkReplyId = null;
    this.update({ talk: 'listening', lastTranscript: null });
    this.log('相談を始めました');
  }

  private endTalk() {
    if (this.snapshot.talk === 'off') return;
    this.client.send({ cmd: 'listen_stop' });
    this.voice.reset();
    this.talkReplyId = null;
    this.update({ talk: 'off' });
  }

  private async answerTalk() {
    this.client.send({ cmd: 'listen_stop' });
    this.update({ talk: 'thinking' });
    const pcm = this.voice.take();
    try {
      const file = new File(Paths.cache, 'hat-talk.wav');
      file.write(pcmToWav(pcm));
      const { text } = await SpeechToText.transcribe(file.uri);
      this.update({ lastTranscript: text });
      this.log(`相談の文字起こし: ${text || '（聞き取れず）'}`);
      let reply: string;
      if (!text.trim()) {
        reply = 'うまく聞き取れませんでした。もう一度お願いします';
      } else {
        if (this.chatThreadId == null) this.chatThreadId = (await createChatThread(this.workSessionId)).id;
        reply = (await postChatMessage(this.chatThreadId, text)).content;
      }
      if (this.snapshot.talk !== 'thinking') return; // 途中で判定に移った
      this.update({ talk: 'speaking' });
      this.talkReplyId = await this.speak(reply);
    } catch (error) {
      this.log(`相談に失敗しました: ${describe(error)}`);
      if (this.snapshot.talk !== 'thinking') return;
      this.update({ talk: 'speaking' });
      this.talkReplyId = await this.speak('相談につながりません').catch(() => null);
    }
  }

  /** 声の wav を帽子で鳴らす。送った play の id を返す */
  private async speak(text: string): Promise<number> {
    const startedAt = Date.now();
    const { wav, source } = await voiceFor(text);
    const id = this.nextPlayId++;
    if (!this.client.play(id, wav)) throw new Error('帽子につながっていません');
    this.log(`声（${sourceLabels[source]}、${Date.now() - startedAt} ms）: ${text}`);
    return id;
  }

  /** 判定を作業に送る。送れなかった分は次に送るときにまとめて送り直す */
  private record(verdict: DetectionIn['verdict'], scene: string, said: string) {
    const sessionId = this.workSessionId;
    if (sessionId == null) return;
    this.unsentDetections.push({
      client_event_id: uuidV4(),
      detected_at: new Date().toISOString(),
      verdict,
      scene,
      said,
      model_version: JUDGE_MODEL_VERSION,
    });
    const batch = this.unsentDetections.slice(0, 200);
    void postDetections(sessionId, batch)
      .then(() => {
        if (this.workSessionId !== sessionId) return;
        this.unsentDetections = this.unsentDetections.filter((d) => !batch.includes(d));
        this.update({ sentDetections: this.snapshot.sentDetections + batch.length });
      })
      .catch((error) => this.log(`判定を送れませんでした（あとで送り直します）: ${describe(error)}`));
  }

  private async sendVolume() {
    const { volume } = await loadSettings();
    this.client.send({ cmd: 'volume', level: volume });
  }

  private log(message: string) {
    const time = new Date().toTimeString().slice(0, 8);
    this.update({ logs: [`${time} ${message}`, ...this.snapshot.logs].slice(0, MAX_LOGS) });
  }

  private update(patch: Partial<HatSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }
}

const sourceLabels = { cache: 'つくり置き', aws: 'AWS', device: '端末の読み上げ' } as const;

function describe(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/** アプリで1つだけ使う */
export const hatController = new HatController();
