// OpenAPI から作った型（schema.d.ts）に短い名前を付ける。schema.d.ts は手で直さず `npm run api:types` で作り直す。
import type { components } from './schema';

export type Schemas = components['schemas'];

export type Role = Schemas['Role'];
/** API の作業の種類（日本語）。画面の英語キーとの変換は src/lib/work-types.ts */
export type ApiWorkType = Schemas['WorkType'];

export type Me = Schemas['Me'];
export type MeUpdate = Schemas['MeUpdate'];
export type LoginCandidate = Schemas['LoginCandidate'];
export type LoginRequest = Schemas['LoginRequest'];
export type TokenResponse = Schemas['TokenResponse'];

export type WorkSession = Schemas['WorkSession'];

export type FieldSummary = Schemas['FieldSummary'];
export type FieldAdvice = Schemas['AdviceOut'];
export type SuggestedSchedule = Schemas['SuggestedSchedule'];
export type SensorReadingOut = Schemas['SensorReadingOut'];

export type ChatThread = Schemas['Thread'];
export type ChatMessage = Schemas['Message'];
