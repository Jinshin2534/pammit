// 「今日の気づき」の録音と文字起こしの境目。画面はここだけを使う。
// 今は仮の実装で、録音は同梱の無音の音声、文字起こしは決まった文を返す。
// 録音と文字起こしのネイティブ部品（PR #35 の SpeechToText.transcribe(wavPath)）が入ったら、
// 下の2つの関数の中身だけを差し替える。録音したファイルは、送るまで消えない場所（documentDirectory）に置く。
import { Asset } from 'expo-asset';

export type RecordedAudio = { uri: string; name: string; mimeType: string; recordedAt: string };

let recordingStartedAt: string | null = null;

/** 録音を始める。マイクの許可はここで求める */
export async function startVoiceNoteRecording(): Promise<void> {
  recordingStartedAt = new Date().toISOString();
}

/** 録音を止めて、端末に残したファイルを返す */
export async function stopVoiceNoteRecording(): Promise<RecordedAudio> {
  const recordedAt = recordingStartedAt ?? new Date().toISOString();
  recordingStartedAt = null;
  const asset = Asset.fromModule(require('../../../assets/audio/voice-note-dummy.wav'));
  await asset.downloadAsync();
  return { uri: asset.localUri ?? asset.uri, name: 'voice-note.wav', mimeType: 'audio/wav', recordedAt };
}

/** 文字に起こす。起こせなかったら（声が入っていないなど）エラーを投げる */
export async function transcribeVoiceNote(audio: RecordedAudio): Promise<string> {
  void audio;
  const text = '（仮の文字起こし）今日は三番ハウスの東側で日焼けした実が多かった。';
  if (!text.trim()) throw new Error('文字に起こせませんでした');
  return text;
}
