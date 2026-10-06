// Android のビルド設定。android/ は prebuild のたびに作り直されるため、ここで書き足す。
// - arm64-v8a だけを入れる（Pixel 7a 向け。音声認識の部品が4種類の CPU 向けの部品を持っていて APK が大きくなるため）
// - .onnx を圧縮せずに入れる（読み込みのたびに展開しなくて済む）
// - 暗号化なしの http を許可する（帽子の API は http のため。本番用のビルドでも帽子につなぐ）
const { withAndroidManifest, withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const MARKER = '// pammit: build options';
const OTHER_ABIS = ['armeabi-v7a', 'x86', 'x86_64'];

function setProperty(properties, key, value) {
  const existing = properties.find((p) => p.type === 'property' && p.key === key);
  if (existing) existing.value = value;
  else properties.push({ type: 'property', key, value });
}

module.exports = function withAndroidBuildOptions(config) {
  config = withAndroidManifest(config, (mod) => {
    mod.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    return mod;
  });
  config = withGradleProperties(config, (mod) => {
    setProperty(mod.modResults, 'reactNativeArchitectures', 'arm64-v8a');
    return mod;
  });
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes(MARKER)) return mod;
    const excludes = OTHER_ABIS.map((abi) => `"lib/${abi}/**"`).join(', ');
    mod.modResults.contents = mod.modResults.contents.replace(
      /\nandroid \{\n/,
      `\nandroid {\n    ${MARKER}\n    androidResources { noCompress += ["onnx"] }\n    packagingOptions { jniLibs { excludes += [${excludes}] } }\n`,
    );
    return mod;
  });
};
