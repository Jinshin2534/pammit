package expo.modules.pammitstt

import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

// PCM WAV の読み込み。読み込み結果はチャンネルごとの -1.0〜1.0 の値にそろえる
object WavCodec {
  class Wav(val sampleRate: Int, val channelCount: Int, val channels: Array<FloatArray>)

  private const val FORMAT_PCM = 1
  private const val FORMAT_FLOAT = 3
  private const val FORMAT_EXTENSIBLE = 0xFFFE

  fun read(file: File): Wav {
    require(file.isFile) { "ファイルがありません" }
    val bytes = file.readBytes()
    val buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    require(bytes.size >= 12 && ascii(bytes, 0) == "RIFF" && ascii(bytes, 8) == "WAVE") { "WAVではありません" }

    var format = -1
    var channelCount = 0
    var sampleRate = 0
    var bits = 0
    var dataStart = -1
    var dataSize = 0
    var pos = 12
    while (pos + 8 <= bytes.size) {
      val id = ascii(bytes, pos)
      val size = buf.getInt(pos + 4)
      val body = pos + 8
      if (id == "fmt " && body + 16 <= bytes.size) {
        format = buf.getShort(body).toInt() and 0xFFFF
        channelCount = buf.getShort(body + 2).toInt()
        sampleRate = buf.getInt(body + 4)
        bits = buf.getShort(body + 14).toInt()
        if (format == FORMAT_EXTENSIBLE && size >= 26 && body + 26 <= bytes.size) {
          format = buf.getShort(body + 24).toInt() and 0xFFFF
        }
      } else if (id == "data") {
        dataStart = body
        // 書き込み途中のファイルはサイズが0や不正値のことがあるので残り全部を使う
        val rest = bytes.size - body
        dataSize = if (size <= 0 || size > rest) rest else size
        break
      }
      if (size < 0) break
      pos = body + size + (size and 1)
    }

    require(format == FORMAT_PCM || format == FORMAT_FLOAT) { "PCMではありません（format=$format）" }
    require(channelCount in 1..8 && sampleRate in 4_000..192_000) { "形式が不正です" }
    require(
      (format == FORMAT_PCM && bits in listOf(8, 16, 24, 32)) || (format == FORMAT_FLOAT && bits == 32)
    ) { "未対応のビット数です（$bits）" }
    require(dataStart >= 0) { "音声データがありません" }

    val bytesPerSample = bits / 8
    val frameCount = dataSize / (bytesPerSample * channelCount)
    require(frameCount > 0) { "音声データが空です" }
    val channels = Array(channelCount) { FloatArray(frameCount) }
    var p = dataStart
    for (i in 0 until frameCount) {
      for (c in 0 until channelCount) {
        channels[c][i] = when {
          format == FORMAT_FLOAT -> buf.getFloat(p)
          bits == 8 -> ((bytes[p].toInt() and 0xFF) - 128) / 128f
          bits == 16 -> buf.getShort(p) / 32768f
          bits == 24 -> ((bytes[p].toInt() and 0xFF) or ((bytes[p + 1].toInt() and 0xFF) shl 8) or (bytes[p + 2].toInt() shl 16)) / 8388608f
          else -> buf.getInt(p) / 2147483648f
        }
        p += bytesPerSample
      }
    }
    return Wav(sampleRate, channelCount, channels)
  }

  fun downmix(channels: Array<FloatArray>, channelCount: Int): FloatArray {
    if (channelCount == 1) return channels[0]
    val out = FloatArray(channels[0].size)
    for (i in out.indices) {
      var sum = 0f
      for (c in 0 until channelCount) sum += channels[c][i]
      out[i] = sum / channelCount
    }
    return out
  }

  private fun ascii(bytes: ByteArray, offset: Int) = String(bytes, offset, 4, Charsets.US_ASCII)
}
