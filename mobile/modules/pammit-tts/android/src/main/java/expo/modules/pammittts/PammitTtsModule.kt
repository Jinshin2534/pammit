package expo.modules.pammittts

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.io.File
import java.util.Locale
import java.util.UUID

class PammitTtsException(code: String, message: String, cause: Throwable? = null) :
  CodedException(code, message, cause)

class PammitTtsModule : Module() {
  private var tts: TextToSpeech? = null
  // 速度とリスナーは端末共通の設定なので、合成は1件ずつ行う
  private val mutex = Mutex()

  override fun definition() = ModuleDefinition {
    Name("PammitTts")

    AsyncFunction("synthesize") Coroutine { text: String, rate: Double ->
      synthesize(text, rate)
    }

    OnDestroy {
      tts?.shutdown()
      tts = null
    }
  }

  private val context: Context
    get() = appContext.reactContext?.applicationContext
      ?: throw PammitTtsException("UNKNOWN", "アプリのContextを取得できません")

  private suspend fun synthesize(text: String, rate: Double): Map<String, Any> {
    if (text.isBlank()) throw PammitTtsException("UNKNOWN", "読み上げる文字がありません")
    if (text.length > TextToSpeech.getMaxSpeechInputLength()) {
      throw PammitTtsException("UNKNOWN", "読み上げる文字が長すぎます")
    }
    return mutex.withLock {
      try {
        withTimeout(TIMEOUT_MS) {
          val engine = ensureEngine()
          val workDir = File(context.cacheDir, "pammit-tts").apply { mkdirs() }
          cleanOldFiles(workDir)
          val id = UUID.randomUUID().toString()
          val rawFile = File(workDir, "raw-$id.wav")
          val outFile = File(workDir, "tts-$id.wav")
          try {
            synthesizeToFile(engine, text, rate.toFloat(), rawFile, id)
            val durationMs = withContext(Dispatchers.IO) { convertTo16kMono(rawFile, outFile) }
            mapOf("wavPath" to outFile.absolutePath, "durationMs" to durationMs)
          } finally {
            rawFile.delete()
          }
        }
      } catch (e: TimeoutCancellationException) {
        throw PammitTtsException("TIMEOUT", "音声合成が${TIMEOUT_MS / 1000}秒以内に終わりませんでした", e)
      } catch (e: CancellationException) {
        throw e
      } catch (e: CodedException) {
        throw e
      } catch (e: Exception) {
        throw PammitTtsException("UNKNOWN", e.message ?: "音声合成に失敗しました", e)
      }
    }
  }

  // 初回だけエンジンを作り、onInit を待ってから日本語を設定する
  private suspend fun ensureEngine(): TextToSpeech {
    tts?.let { return it }
    val ready = CompletableDeferred<Int>()
    val engine = withContext(Dispatchers.Main) {
      TextToSpeech(context) { status -> ready.complete(status) }
    }
    try {
      if (ready.await() != TextToSpeech.SUCCESS) {
        throw PammitTtsException("TTS_UNAVAILABLE", "音声合成エンジンを起動できません")
      }
      val result = engine.setLanguage(Locale.JAPAN)
      if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
        throw PammitTtsException("TTS_UNAVAILABLE", "日本語の音声がありません")
      }
    } catch (e: Throwable) {
      engine.shutdown()
      throw e
    }
    tts = engine
    return engine
  }

  private suspend fun synthesizeToFile(
    engine: TextToSpeech,
    text: String,
    rate: Float,
    file: File,
    utteranceId: String
  ) {
    val done = CompletableDeferred<Unit>()
    engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
      override fun onStart(id: String?) = Unit

      override fun onDone(id: String?) {
        if (id == utteranceId) done.complete(Unit)
      }

      @Deprecated("Deprecated in Java")
      override fun onError(id: String?) {
        onError(id, TextToSpeech.ERROR)
      }

      override fun onError(id: String?, errorCode: Int) {
        if (id != utteranceId) return
        val code = if (errorCode == TextToSpeech.ERROR_NOT_INSTALLED_YET) "TTS_UNAVAILABLE" else "UNKNOWN"
        done.completeExceptionally(PammitTtsException(code, "音声合成に失敗しました（$errorCode）"))
      }
    })
    engine.setSpeechRate(rate.coerceIn(0.1f, 4f))
    val queued = engine.synthesizeToFile(text, Bundle(), file, utteranceId)
    if (queued != TextToSpeech.SUCCESS) {
      throw PammitTtsException("UNKNOWN", "音声合成を開始できません")
    }
    done.await()
  }

  private fun convertTo16kMono(rawFile: File, outFile: File): Long {
    val wav = try {
      WavCodec.read(rawFile)
    } catch (e: IllegalArgumentException) {
      throw PammitTtsException("UNKNOWN", "合成した音声を読めません: ${e.message}", e)
    }
    val mono = WavCodec.downmix(wav.channels, wav.channelCount)
    val samples = WavCodec.resampleLinear(mono, wav.sampleRate, OUTPUT_SAMPLE_RATE)
    WavCodec.writePcm16Mono(outFile, samples, OUTPUT_SAMPLE_RATE)
    return samples.size * 1000L / OUTPUT_SAMPLE_RATE
  }

  // 前回までの出力が溜まり続けないよう、古いものを消す
  private fun cleanOldFiles(dir: File) {
    val limit = System.currentTimeMillis() - KEEP_FILES_MS
    dir.listFiles()?.filter { it.lastModified() < limit }?.forEach { it.delete() }
  }

  companion object {
    private const val TIMEOUT_MS = 15_000L
    private const val OUTPUT_SAMPLE_RATE = 16_000
    private const val KEEP_FILES_MS = 60 * 60 * 1000L
  }
}
