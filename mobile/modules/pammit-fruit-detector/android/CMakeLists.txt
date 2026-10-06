# ONNX Runtime の Java API 用 JNI（libonnxruntime4j_jni.so）を 1.28.2 のソースから作る。
# libonnxruntime.so はリンクだけ行い、APK には sherpa-onnx のものが入る。
cmake_minimum_required(VERSION 3.22.1)
project(pammit_fruit_detector C)

file(GLOB ORT_JNI_SOURCES "${ORT_DIR}/java/src/main/native/*.c")
add_library(onnxruntime4j_jni SHARED ${ORT_JNI_SOURCES})
set_property(TARGET onnxruntime4j_jni PROPERTY C_STANDARD 11)
target_include_directories(onnxruntime4j_jni PRIVATE
  "${ORT_DIR}/include"
  "${ORT_DIR}/include/onnxruntime/core/session"
  "${ORT_DIR}/orttraining/orttraining/training_api/include"
  "${ORT_DIR}/generated/headers")
target_link_directories(onnxruntime4j_jni PRIVATE "${ORT_DIR}/jni/${ANDROID_ABI}")
target_link_libraries(onnxruntime4j_jni PRIVATE onnxruntime)
target_link_options(onnxruntime4j_jni PRIVATE "-Wl,-z,max-page-size=16384")
