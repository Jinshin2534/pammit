// 「今日の気づき」の録音と文字起こしの境目。画面はここだけを使う。
// スマホのマイクで 16kHz の wav を録り、端末内の音声認識（ReazonSpeech）で文字に起こす。
// 録音したファイルは、送るまで消えない場所（documentDirectory）に置く。
import { Directory, File, Paths } from 'expo-file-system';
import { PermissionsAndroid, Platform } from 'react-native';

import { SpeechToText } from '@/native';

export type RecordedAudio = { uri: string; name: string; mimeType: string; recordedAt: string };

let recording: { file: File; startedAt: string } | null = null;

async function ensureMicPermission() {
  if (Platform.OS !== 'android') return;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (result !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('マイクの許可がないため録音できません');
}

/** 録音を始める。マイクの許可はここで求める */
export async function startVoiceNoteRecording(): Promise<void> {
  await ensureMicPermission();
  const dir = new Directory(Paths.document, 'voice-notes');
  if (!dir.exists) dir.create({ intermediates: true });
  const startedAt = new Date().toISOString();
  const file = new File(dir, `voice-note-${startedAt.replace(/[:.]/g, '-')}.wav`);
  await SpeechToText.startRecording(file.uri);
  recording = { file, startedAt };
}

/** 録音を止めて、端末に残したファイルを返す */
export async function stopVoiceNoteRecording(): Promise<RecordedAudio> {
  if (!recording) throw new Error('録音していません');
  const { file, startedAt } = recording;
  recording = null;
  await SpeechToText.stopRecording();
  return { uri: file.uri, name: file.name, mimeType: 'audio/wav', recordedAt: startedAt };
}

/** 文字に起こす。起こせなかったら（声が入っていないなど）エラーを投げる */
export async function transcribeVoiceNote(audio: RecordedAudio): Promise<string> {
  await SpeechToText.load();
  const { text } = await SpeechToText.transcribe(audio.uri);
  if (!text.trim()) throw new Error('文字に起こせませんでした');
  return text;
}
