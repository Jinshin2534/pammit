// client_event_id（冪等キー）に使う UUID v4。ネイティブのパッケージを足さずに JS で作る。
// crypto.getRandomValues があればそれを使い、なければ Math.random にする（暗号の用途には使わない）。

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
  if (typeof cryptoApi?.getRandomValues === 'function') {
    try {
      cryptoApi.getRandomValues(bytes);
      return bytes;
    } catch {
      // 使えないときは下の Math.random にする
    }
  }
  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

export function uuidV4(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
