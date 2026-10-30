# AGENTS.md — aturan kerja repository Kelas Hari Ini

> **Tentang pembacaan otomatis:** file `AGENTS.md` hanya berpengaruh jika alat yang dipakai
> memang membacanya (mis. agen coding yang mencari `AGENTS.md` di root repo). Repository ini
> **tidak** memiliki mekanisme apa pun yang memaksa itu terjadi, tidak ada memori permanen
> antar sesi, dan tidak ada hook yang menjalankan aturan di bawah secara otomatis. Bila agen
> tidak membacanya, instruksi ini tidak berlaku dengan sendirinya — minta agen membaca file ini
> lebih dulu.

Dokumen ini punya dua bagian:

- **Bagian A — Aturan scaffold Expo** (bawaan template, dipertahankan apa adanya).
- **Bagian B — Aturan proyek** (produk, desain, data, pelaporan).

---

## Bagian A — Aturan scaffold Expo (bawaan template)

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

## Bagian B — Aturan proyek

### B1. Dokumen acuan (baca sebelum menyentuh kode)

| Dokumen | Isi | Kapan dibaca |
|---|---|---|
| `PRD.md` | Kebutuhan produk, kriteria penerimaan, batasan produk | Setiap awal tugas |
| `DESIGN_BRIEF.md` | Sumber kebenaran visual + blok token | Setiap tugas yang menyentuh UI |
| `IMPLEMENTATION_STATUS.md` | Status nyata: apa yang ada di kode, apa yang sudah/belum diuji, masalah diketahui | Setiap awal tugas & wajib diperbarui di akhir |
| `ANDROID_TESTING.md` | Prosedur build EAS + checklist uji perangkat | Setiap tugas build/uji |

### B2. Alur kerja pada awal setiap tugas coding

1. **Baca** `PRD.md`, `DESIGN_BRIEF.md`, dan `IMPLEMENTATION_STATUS.md`.
2. **Audit** file implementasi yang terkait sebelum mengubah apa pun. Jangan mengandalkan status yang ditulis di laporan lama: cocokkan dengan kode.
3. **Bandingkan** permintaan baru dengan kebutuhan (`PRD.md`) dan batasan produk (§4 PRD). Periksa juga daftar "tidak boleh ditambahkan tanpa persetujuan".
4. **Jika ada konflik**, jelaskan konfliknya dan usulkan keputusan **terkecil** yang tetap sesuai arah produk. Jangan diam-diam mengubah arah produk, jangan menambah fitur sebagai "bonus".
5. **Kerjakan hanya tahap yang diminta.** Berhenti di batas tahap.
6. **Jalankan pemeriksaan yang relevan** (`npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform android`, uji lapisan data bila menyentuh `db/`) dan laporkan hasil **aktual**, termasuk yang gagal.
7. **Perbarui `IMPLEMENTATION_STATUS.md`** setelah tahap selesai (status fitur, pengujian baru, masalah baru).
8. **Jangan commit atau push** kecuali diminta secara eksplisit.
9. **Jangan mengklaim** fitur atau pengujian berhasil bila belum diverifikasi. Bedakan uji statis, uji lapisan data, dan uji perangkat.

### B3. Aturan produk

- Single-user, 100% lokal. Tidak ada akun, backend, API server, sinkronisasi cloud, atau push notification dari server.
- Notifikasi hanya boleh **lokal** (`expo-notifications`). Dilarang: Expo Push Token, `getExpoPushTokenAsync`, FCM, atau server notifikasi.
- Aturan notifikasi yang sudah berlaku: channel Android `class-reminders`, izin hanya diminta lewat aksi pengguna, pengingat disinkronkan dari SQLite lewat rekonsiliasi idempoten (bukan `cancelAllScheduledNotificationsAsync`), dan tidak ada tabel baru untuk menyimpan ID notifikasi.
- Jangan menambah fitur di luar `PRD.md` tanpa persetujuan.
- Jangan menambah dependency tanpa alasan teknis yang dijelaskan dan persetujuan.

### B4. Aturan data

- Semua data operasional di SQLite (`expo-sqlite`, file `hari-ini.db`).
- Tidak ada SQL di komponen UI. Semua akses data lewat modul di `db/`.
- Semua nilai pengguna dikirim sebagai parameter terikat. Dilarang merangkai SQL dari string input (termasuk `PRAGMA user_version`, yang hanya boleh memakai konstanta internal).
- Migrasi: naikkan `SCHEMA_VERSION`, tambahkan langkah baru berurutan, **aditif + backfill**, di dalam satu transaksi. Dilarang `DROP`/`DELETE`/membangun ulang tabel tanpa rencana pemindahan data yang diuji. Kriteria keberhasilan ada di `PRD.md` §10.4.
- Seed hanya ditulis oleh migrasi v1 (`INSERT OR IGNORE`), tidak pernah dijalankan ulang, tidak pernah diubah untuk memenuhi skenario uji.
- **Dilarang** menghapus database, mereset seed, atau menurunkan versi skema untuk mempermudah pekerjaan.
- Uji migrasi pada **salinan** database/sintetis, bukan database pengguna.

### B5. Aturan desain

- `lib/tokens.ts` satu-satunya sumber nilai visual. `theme/useTheme.ts` hanya logika tema.
- Dilarang hex, ukuran font, `fontWeight`, radius, jarak, atau ukuran ikon literal di komponen; pakai token.
- Blok `typography` di `lib/tokens.ts` tidak boleh diubah; nilai tambahan masuk ke ekspor terpisah dan didokumentasikan di `DESIGN_BRIEF.md`.
- Komponen baru hanya bila memang dibutuhkan oleh tahap yang sedang dikerjakan; ikuti hierarki & state pada brief.
- Setiap status harus punya label teks, bukan hanya warna.

### B6. Aturan build & lingkungan

- Android lewat **EAS Build**; jangan membuat `android/`/`ios/` manual, jangan mengubah `targetSdk` demi memaksa build.
- Jangan pernah meminta pengguna memasang Android Studio/JDK/SDK/adb atau menjalankan `npx expo run:android`.
- Aturan ini **menimpa** salah satu opsi di Bagian A ("development build: `npx expo run:ios|android`"): satu-satunya jalur build yang dipakai proyek ini adalah **EAS Build**.
- Jangan menimpa `extra.eas.projectId` yang sudah valid; jangan menaruh token/kredensial di source, `eas.json`, prompt, atau log.
- Di sandbox/CI tanpa jaringan Expo: `npx expo install` gagal — cocokkan versi dengan `node_modules/expo/bundledNativeModules.json` lalu `npm install <paket>@<versi>`.
- `node_modules` mungkin tidak terbawa antar sesi: jalankan `npm ci` sebelum `npx tsc`/`npx expo lint`.

### B7. Format laporan ke pengguna

- Bahasa Indonesia, bernomor dan bertahap.
- Sebutkan: fitur yang benar-benar jadi, file dibuat/diubah, perubahan skema (bila ada), hasil perintah apa adanya, dan hal yang belum diuji.
- Setelah selesai, berhenti. Jangan melanjutkan tahap berikutnya tanpa instruksi.
