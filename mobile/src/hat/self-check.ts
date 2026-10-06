// 帽子なしで、スマホの判定・AWS の声・相談の API が通しで動くかを確かめる。写真は同梱の試験用の1枚。

import { createChatThread, postChatMessage } from '@/api/chat';
import { FruitDetector, SpeechToText } from '@/native';

import { prepareFixedPhrases, voiceFor } from './voice';

export type CheckStep = { name: string; ok: boolean; detail: string; ms: number };

const QUESTION = '摘葉で気をつけることを一言で教えてください';

async function step(name: string, run: () => Promise<string>): Promise<CheckStep> {
  const startedAt = Date.now();
  try {
    return { name, ok: true, detail: await run(), ms: Date.now() - startedAt };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { name, ok: false, detail, ms: Date.now() - startedAt };
  }
}

/** 順に確かめ、1つ終わるごとに onStep を呼ぶ */
export async function runSelfCheck(onStep: (step: CheckStep) => void): Promise<void> {
  const report = (s: CheckStep) => {
    onStep(s);
    return s.ok;
  };

  if (!report(await step('モデルの読み込み', async () => {
    await Promise.all([FruitDetector.load(), SpeechToText.load()]);
    return '判定と音声認識';
  }))) return;

  const sample = await FruitDetector.sampleImagePath();
  if (sample) {
    for (const judging of [false, true]) {
      report(await step(judging ? '判定（「これ」のつもり）' : '判定（「お願い」のつもり）', async () => {
        const a = await FruitDetector.judgeFile(sample, judging);
        return `${a.say}（${a.scene}、実 ${a.fruits}個・陰 ${a.shadedFruits}、判定 ${a.timingMs.total ?? '?'} ms）`;
      }));
    }
  } else {
    report({ name: '判定', ok: false, detail: '試験用の写真がアプリに入っていません', ms: 0 });
  }

  report(await step('決まった言葉の声（AWS）', async () => {
    const made = await prepareFixedPhrases();
    if (made === 0) throw new Error('1つもつくれませんでした（ログインしているか、ネットにつながっているか）');
    return `${made}個`;
  }));

  report(await step('声（その場でつくる）', async () => {
    const v = await voiceFor('次は、左下の実に、取る葉があります。');
    return `${v.source === 'aws' ? 'AWS' : v.source === 'cache' ? 'つくり置き' : '端末の読み上げ'}、${v.wav.byteLength} バイト`;
  }));

  report(await step('相談の API', async () => {
    const thread = await createChatThread();
    const reply = await postChatMessage(thread.id, QUESTION);
    return reply.content.slice(0, 60);
  }));
}
