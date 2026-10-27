// Konfigurasi Metro. Wajib ada agar `expo-sqlite` bisa di-bundle untuk web:
// paket itu mengimpor `wa-sqlite.wasm`, dan Metro secara bawaan tidak
// menganggap `.wasm` sebagai aset. Tanpa ini, `expo export --platform web`
// gagal dengan "Unable to resolve module ./wa-sqlite/wa-sqlite.wasm".
// Android dan iOS tidak terpengaruh.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');

module.exports = config;
