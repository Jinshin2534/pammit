package expo.modules.pammitfruitdetector

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.os.SystemClock
import androidx.exifinterface.media.ExifInterface
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.MalformedURLException
import java.net.SocketTimeoutException
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class PammitFruitException(code: String, message: String, cause: Throwable? = null) :
  CodedException(code, message, cause)

class PammitFruitDetectorModule : Module() {
  private var detector: FruitYolo? = null
  private var classifier: ShadeClassifier? = null
  // 読み込み・解放・検出が同時に走らないようにする
  private val mutex = Mutex()

  override fun definition() = ModuleDefinition {
    Name("PammitFruitDetector")

    AsyncFunction("load") Coroutine { ->
      load()
    }

    AsyncFunction("unload") Coroutine { ->
      mutex.withLock { release() }
    }

    AsyncFunction("captureAndDetect") Coroutine { hatBaseUrl: String, timeoutMs: Double ->
      captureAndDetect(hatBaseUrl, timeoutMs.toInt().coerceAtLeast(1))
    }

    AsyncFunction("detectFile") Coroutine { path: String ->
      detectFile(path)
    }

    AsyncFunction("sampleImagePath") Coroutine { ->
      sampleImagePath()
    }

    OnDestroy {
      release()
    }
  }

  private val context: Context
    get() = appContext.reactContext?.applicationContext
      ?: throw PammitFruitException("UNKNOWN", "アプリのContextを取得できません")

  private suspend fun load() = withContext(Dispatchers.Default) {
    mutex.withLock {
      if (detector != null) return@withLock
      val models = MODEL_FILES.map { name ->
        try {
          context.assets.open("$ASSET_DIR/$name").use { it.readBytes() }
        } catch (e: IOException) {
          throw PammitFruitException(
            "MODEL_LOAD_FAILED",
            "モデルファイルがありません: $name（scripts/fetch-fruit-detector.sh を実行してください）",
            e
          )
        }
      }
      try {
        val yolo = FruitYolo(models[0])
        try {
          classifier = ShadeClassifier(models[1], models[2])
        } catch (e: Throwable) {
          yolo.close()
          throw e
        }
        detector = yolo
      } catch (e: Throwable) {
        throw PammitFruitException("MODEL_LOAD_FAILED", "果実検出モデルを読み込めません: ${e.message}", e)
      }
    }
  }

  private fun release() {
    detector?.close()
    classifier?.close()
    detector = null
    classifier = null
  }

  private suspend fun captureAndDetect(hatBaseUrl: String, timeoutMs: Int): Map<String, Any?> =
    mutex.withLock {
      val models = loadedModels()
      val startedAt = SystemClock.elapsedRealtime()
      val jpeg = withContext(Dispatchers.IO) { fetchJpeg(hatBaseUrl, timeoutMs) }
      val capturedAt = isoNow()
      val captureMs = SystemClock.elapsedRealtime() - startedAt
      withContext(Dispatchers.Default) { runPipeline(models, jpeg, capturedAt, captureMs) }
    }

  private suspend fun detectFile(path: String): Map<String, Any?> = mutex.withLock {
    val models = loadedModels()
    val capturedAt = isoNow()
    val jpeg = withContext(Dispatchers.IO) {
      try {
        File(toFilePath(path)).readBytes()
      } catch (e: IOException) {
        throw PammitFruitException("UNKNOWN", "画像ファイルを読めません: ${e.message}", e)
      }
    }
    withContext(Dispatchers.Default) { runPipeline(models, jpeg, capturedAt, 0L) }
  }

  // 同梱の試験用写真をキャッシュへ書き出して、そのパスを返す（無ければ null）
  private suspend fun sampleImagePath(): String? = withContext(Dispatchers.IO) {
    val file = File(context.cacheDir, "pammit-fruit/sample.jpg")
    try {
      if (!file.exists()) {
        file.parentFile?.mkdirs()
        context.assets.open("$ASSET_DIR/sample.jpg").use { input ->
          file.outputStream().use { input.copyTo(it) }
        }
      }
      file.absolutePath
    } catch (e: IOException) {
      file.delete()
      null
    }
  }

  private fun loadedModels(): Pair<FruitYolo, ShadeClassifier> {
    val yolo = detector
    val shade = classifier
    if (yolo == null || shade == null) {
      throw PammitFruitException("MODEL_NOT_LOADED", "果実検出モデルが読み込まれていません")
    }
    return yolo to shade
  }

  private fun runPipeline(
    models: Pair<FruitYolo, ShadeClassifier>,
    jpeg: ByteArray,
    capturedAt: String,
    captureMs: Long
  ): Map<String, Any?> {
    val (yolo, shade) = models
    var t = SystemClock.elapsedRealtime()
    val image = decode(jpeg)
    try {
      val decodeMs = SystemClock.elapsedRealtime() - t
      val width = image.width
      val height = image.height
      try {
        t = SystemClock.elapsedRealtime()
        val detections = yolo.detect(image)
        val detectMs = SystemClock.elapsedRealtime() - t

        // 枠幅が画像幅の1.5%未満の実は陰の判定をしない
        t = SystemClock.elapsedRealtime()
        val targets = detections.indices.filter { detections[it].box.width() / width >= MIN_WIDTH_RATIO }
        val probabilities = shade.probabilities(image, targets.map { detections[it].box })
        val shadeByIndex = targets.zip(probabilities.toList()).toMap()
        val observeMs = SystemClock.elapsedRealtime() - t

        val objects = detections.mapIndexed { i, d ->
          val p = shadeByIndex[i]
          mapOf(
            "id" to "obj-${i + 1}",
            "class" to "fruit",
            "bbox" to listOf(
              (d.box.left / width).toDouble(),
              (d.box.top / height).toDouble(),
              (d.box.width() / width).toDouble(),
              (d.box.height() / height).toDouble()
            ),
            "score" to d.score.toDouble(),
            "light" to (p?.let { ShadeClassifier.state(it) } ?: "unknown"),
            "shadeProbability" to p?.toDouble(),
            "lightReason" to (if (p == null) "fruit_too_small" else null),
            "leafCover" to null
          )
        }
        return mapOf(
          "frameId" to UUID.randomUUID().toString(),
          "capturedAt" to capturedAt,
          "imageWidth" to width,
          "imageHeight" to height,
          "modelVersion" to MODEL_VERSION,
          "objects" to objects,
          "timingMs" to mapOf(
            "capture" to captureMs,
            "decode" to decodeMs,
            "detect" to detectMs,
            "observe" to observeMs
          )
        )
      } catch (e: CancellationException) {
        throw e
      } catch (e: CodedException) {
        throw e
      } catch (e: Exception) {
        throw PammitFruitException("UNKNOWN", "果実検出に失敗しました: ${e.message}", e)
      }
    } finally {
      image.recycle()
    }
  }

  private fun fetchJpeg(hatBaseUrl: String, timeoutMs: Int): ByteArray {
    val url = try {
      URL(hatBaseUrl.trimEnd('/') + "/capture")
    } catch (e: MalformedURLException) {
      throw PammitFruitException("HAT_UNREACHABLE", "帽子の接続先が正しくありません: $hatBaseUrl", e)
    }
    val deadline = SystemClock.elapsedRealtime() + timeoutMs
    val timeoutError = { cause: Throwable? ->
      PammitFruitException("TIMEOUT", "$hatBaseUrl からの撮影が${timeoutMs}ms以内に終わりませんでした", cause)
    }
    val connection = try {
      url.openConnection() as HttpURLConnection
    } catch (e: IOException) {
      throw PammitFruitException("HAT_UNREACHABLE", "帽子につながりません: ${e.message}", e)
    }
    try {
      connection.connectTimeout = timeoutMs
      connection.readTimeout = timeoutMs
      connection.useCaches = false
      val status = connection.responseCode
      if (status != HttpURLConnection.HTTP_OK) {
        throw PammitFruitException("UNKNOWN", "帽子が撮影に失敗しました（HTTP $status）")
      }
      // 読み取りの合間に全体の期限も確かめる
      connection.inputStream.use { input ->
        val out = ByteArrayOutputStream()
        val buffer = ByteArray(64 * 1024)
        while (true) {
          if (SystemClock.elapsedRealtime() > deadline) throw timeoutError(null)
          val n = input.read(buffer)
          if (n < 0) break
          out.write(buffer, 0, n)
        }
        return out.toByteArray()
      }
    } catch (e: SocketTimeoutException) {
      throw timeoutError(e)
    } catch (e: CodedException) {
      throw e
    } catch (e: IOException) {
      throw PammitFruitException("HAT_UNREACHABLE", "帽子につながりません: ${e.message}", e)
    } finally {
      connection.disconnect()
    }
  }

  // JPEG を読み、EXIF の向きを反映した RGB 画像にする
  private fun decode(jpeg: ByteArray): Bitmap {
    val options = BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.ARGB_8888 }
    val raw = BitmapFactory.decodeByteArray(jpeg, 0, jpeg.size, options)
      ?: throw PammitFruitException("UNKNOWN", "JPEGを読めません")
    val orientation = try {
      ExifInterface(ByteArrayInputStream(jpeg))
        .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    } catch (e: IOException) {
      ExifInterface.ORIENTATION_NORMAL
    }
    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.setScale(-1f, 1f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.setRotate(180f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.setScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> {
        matrix.setRotate(90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.setRotate(90f)
      ExifInterface.ORIENTATION_TRANSVERSE -> {
        matrix.setRotate(-90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.setRotate(-90f)
      else -> return raw
    }
    val oriented = Bitmap.createBitmap(raw, 0, 0, raw.width, raw.height, matrix, true)
    if (oriented !== raw) raw.recycle()
    return oriented
  }

  private fun isoNow(): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(Date())

  private fun toFilePath(path: String): String =
    if (path.startsWith("file://")) Uri.parse(path).path ?: path else path

  companion object {
    private const val ASSET_DIR = "fruit"
    private val MODEL_FILES = listOf("fruit-yolo11n.onnx", "scene_encoder.onnx", "shade70.onnx")
    private const val MODEL_VERSION = "fruit-yolo11n+shade70"
    private const val MIN_WIDTH_RATIO = 0.015f
  }
}
