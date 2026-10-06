package expo.modules.pammitstt

import android.content.Context
import android.net.Uri
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import com.k2fsa.sherpa.onnx.OfflineTransducerModelConfig
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException

class PammitSttException(code: String, message: String, cause: Throwable? = null) :
  CodedException(code, message, cause)

class PammitSttModule : Module() {
  private var recognizer: OfflineRecognizer? = null
  private var recorder: WavRecorder? = null
  // 読み込み・解放・認識が同時に走らないようにする
  private val mutex = Mutex()

  override fun definition() = ModuleDefinition {
    Name("PammitStt")

    AsyncFunction("load") Coroutine { ->
      load()
    }

    AsyncFunction("unload") Coroutine { ->
      mutex.withLock {
        recognizer?.release()
        recognizer = null
      }
    }

    AsyncFunction("transcribe") Coroutine { wavPath: String ->
      transcribe(wavPath)
    }

    // スマホのマイクで録音を始める（16kHz・16bit・モノラルの wav）。マイクの許可は先に求めておく
    AsyncFunction("startRecording") Coroutine { wavPath: String ->
      withContext(Dispatchers.IO) {
        recorder?.stop()
        try {
          recorder = WavRecorder(File(toFilePath(wavPath))).also { it.start() }
        } catch (e: Exception) {
          recorder = null
          throw PammitSttException("INVALID_AUDIO", "録音を始められません: ${e.message}", e)
        }
      }
    }

    // 録音を止めて、録った長さ（ミリ秒）を返す
    AsyncFunction("stopRecording") Coroutine { ->
      withContext(Dispatchers.IO) {
        val r = recorder ?: throw PammitSttException("INVALID_AUDIO", "録音していません")
        recorder = null
        mapOf("durationMs" to r.stop())
      }
    }

    OnDestroy {
      recorder?.stop()
      recorder = null
      recognizer?.release()
      recognizer = null
    }
  }

  private val context: Context
    get() = appContext.reactContext?.applicationContext
      ?: throw PammitSttException("UNKNOWN", "アプリのContextを取得できません")

  private suspend fun load() = withContext(Dispatchers.Default) {
    mutex.withLock {
      if (recognizer != null) return@withLock
      val assets = context.assets
      // ファイルが無いとネイティブ側で落ちるため、先に確認する
      for (name in listOf(ENCODER, DECODER, JOINER, TOKENS)) {
        try {
          assets.open(name).close()
        } catch (e: IOException) {
          throw PammitSttException(
            "MODEL_LOAD_FAILED",
            "モデルファイルがありません: $name（scripts/fetch-native-models.sh を実行してください）",
            e
          )
        }
      }
      val config = OfflineRecognizerConfig(
        featConfig = FeatureConfig(sampleRate = SAMPLE_RATE, featureDim = 80),
        modelConfig = OfflineModelConfig(
          transducer = OfflineTransducerModelConfig(encoder = ENCODER, decoder = DECODER, joiner = JOINER),
          tokens = TOKENS,
          numThreads = NUM_THREADS,
          modelType = "transducer",
        ),
        decodingMethod = "greedy_search",
      )
      recognizer = try {
        OfflineRecognizer(assetManager = assets, config = config)
      } catch (e: Throwable) {
        throw PammitSttException("MODEL_LOAD_FAILED", "音声認識モデルを読み込めません: ${e.message}", e)
      }
    }
  }

  private suspend fun transcribe(wavPath: String): Map<String, Any> = withContext(Dispatchers.Default) {
    mutex.withLock {
      val current = recognizer
        ?: throw PammitSttException("MODEL_NOT_LOADED", "音声認識モデルが読み込まれていません")
      val wav = try {
        WavCodec.read(File(toFilePath(wavPath)))
      } catch (e: IllegalArgumentException) {
        throw PammitSttException("INVALID_AUDIO", "音声ファイルを読めません: ${e.message}", e)
      } catch (e: IOException) {
        throw PammitSttException("INVALID_AUDIO", "音声ファイルを読めません: ${e.message}", e)
      }
      val samples = WavCodec.downmix(wav.channels, wav.channelCount)
      try {
        val stream = current.createStream()
        try {
          // 16kHz以外は sherpa-onnx 側でリサンプルされる
          stream.acceptWaveform(samples, wav.sampleRate)
          current.decode(stream)
          val text = current.getResult(stream).text.trim()
          mapOf("text" to text, "durationMs" to samples.size * 1000L / wav.sampleRate)
        } finally {
          stream.release()
        }
      } catch (e: CancellationException) {
        throw e
      } catch (e: Exception) {
        throw PammitSttException("UNKNOWN", "音声認識に失敗しました: ${e.message}", e)
      }
    }
  }

  private fun toFilePath(path: String): String =
    if (path.startsWith("file://")) Uri.parse(path).path ?: path else path

  companion object {
    private const val SAMPLE_RATE = 16_000
    private const val NUM_THREADS = 4
    private const val MODEL_DIR = "reazonspeech"
    private const val ENCODER = "$MODEL_DIR/encoder-epoch-99-avg-1.int8.onnx"
    private const val DECODER = "$MODEL_DIR/decoder-epoch-99-avg-1.onnx"
    private const val JOINER = "$MODEL_DIR/joiner-epoch-99-avg-1.int8.onnx"
    private const val TOKENS = "$MODEL_DIR/tokens.txt"
  }
}
