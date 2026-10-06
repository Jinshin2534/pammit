package expo.modules.pammitstt

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import java.io.File
import java.io.RandomAccessFile

// スマホのマイクで 16kHz・16bit・モノラルの wav を録る（音声認識にそのまま渡せる形）。
class WavRecorder(private val file: File) {
  private var record: AudioRecord? = null
  private var thread: Thread? = null
  @Volatile private var running = false
  private var bytes = 0L

  @SuppressLint("MissingPermission") // 許可は JS 側で先に求める
  fun start() {
    val minBuffer = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    val recorder = AudioRecord(
      MediaRecorder.AudioSource.VOICE_RECOGNITION, SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, maxOf(minBuffer, SAMPLE_RATE)
    )
    if (recorder.state != AudioRecord.STATE_INITIALIZED) {
      recorder.release()
      throw IllegalStateException("マイクを使えません")
    }
    file.parentFile?.mkdirs()
    val out = RandomAccessFile(file, "rw")
    out.setLength(0)
    out.write(ByteArray(44)) // ヘッダーは止めたときに書く
    record = recorder
    running = true
    recorder.startRecording()
    thread = Thread {
      val buffer = ByteArray(3200)
      out.use {
        while (running) {
          val n = recorder.read(buffer, 0, buffer.size)
          if (n > 0) {
            it.write(buffer, 0, n)
            bytes += n
          }
        }
        writeHeader(it, bytes)
      }
    }.also { it.start() }
  }

  /** 止めて、録った長さ（ミリ秒）を返す */
  fun stop(): Long {
    running = false
    thread?.join(2000)
    record?.stop()
    record?.release()
    record = null
    thread = null
    return bytes * 1000 / (SAMPLE_RATE * 2)
  }

  private fun writeHeader(out: RandomAccessFile, dataBytes: Long) {
    val header = java.nio.ByteBuffer.allocate(44).order(java.nio.ByteOrder.LITTLE_ENDIAN)
    header.put("RIFF".toByteArray()).putInt((36 + dataBytes).toInt()).put("WAVE".toByteArray())
    header.put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(1)
      .putInt(SAMPLE_RATE).putInt(SAMPLE_RATE * 2).putShort(2).putShort(16)
    header.put("data".toByteArray()).putInt(dataBytes.toInt())
    out.seek(0)
    out.write(header.array())
  }

  companion object {
    const val SAMPLE_RATE = 16000
  }
}
