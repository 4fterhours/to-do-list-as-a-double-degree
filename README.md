# Kelas Hari Ini

Aplikasi mobile pribadi untuk mahasiswa: **jadwal kuliah mingguan dan tugas akademik dalam satu layar**.
Dibangun dengan React Native + Expo (SDK 58) + TypeScript + Expo Router.

**Tujuan:** menjawab empat pertanyaan harian tanpa koneksi internet — kelas apa berikutnya (jam dan ruang),
masih berapa kelas lagi hari ini, tugas apa yang paling mendesak, dan bagaimana mengubah jadwal/tugas itu.
Satu pengguna, satu perangkat, tanpa akun.

## Fitur yang tersedia di kode

| Fitur | Keadaan |
|---|---|
| **Layar Hari Ini** — kelas berikutnya / sedang berlangsung, hitung mundur, sisa kelas, daftar tugas menurut deadline | Ada di kode |
| **Jadwal** — daftar per hari (Senin → Minggu, urut jam), tambah, ubah, hapus berkonfirmasi, tolak jadwal duplikat | Ada di kode |
| **Tugas** — daftar belum selesai/selesai, tambah, ubah, hapus, tandai selesai & buka kembali, relasi mata kuliah | Ada di kode |
| **Identitas mata kuliah** — satu mata kuliah dipakai bersama oleh banyak sesi jadwal dan banyak tugas | Ada di kode |
| **Penyimpanan lokal persisten** — SQLite dengan skema berversi (v2), migrasi aditif, seed idempoten | Ada di kode & teruji di lapisan data |
| **Pengingat kelas lokal** — notifikasi mingguan per jadwal, channel Android, izin hanya lewat aksi pengguna | Ada di kode & teruji di logika |
| **Layar kelola mata kuliah** (daftar, ubah nama, hapus) | **Belum ada** (FR-B7, prioritas P2) |

> Semua fitur di atas **belum pernah dijalankan pada APK/perangkat** dari repository ini. Yang sudah
> terbukti adalah pemeriksaan statis dan pengujian logika/data di Node — lihat
> [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) §1.1.

## Arsitektur: offline-first, satu sumber kebenaran

```
komponen (components/, src/app/)   ← hanya tampilan, tanpa SQL
        ↓ membaca
hooks/ (useTodayData, useReminderStatus, useFocusQuery)
        ↓ memanggil
db/ (schema, database, schedules, tasks, courses, seed)   ← satu-satunya penulis SQLite
        ↓
SQLite lokal: hari-ini.db
        ↓ dicerminkan ke
lib/notificationSync.ts → lib/notificationScheduler.ts → expo-notifications (lokal)
```

- **Tanpa jaringan saat runtime.** Tidak ada request HTTP, token, akun, backend, analytics, atau sinkronisasi
  cloud. Tidak ada push notification dari server — hanya notifikasi lokal yang dibuat perangkat.
- **SQLite adalah sumber kebenaran.** Semua data operasional ada di satu file `hari-ini.db` di direktori
  dokumen aplikasi. UI tidak menulis SQL: seluruh akses lewat `db/`.
- **Skema berversi.** `PRAGMA user_version` + migrasi bertahap yang aditif dan idempoten. Migrasi tidak
  pernah menghapus data pengguna; seed contoh hanya ditulis saat database pertama kali dibuat.
- **Perangkat hanya cermin notifikasi.** `lib/notificationSync.ts` membaca seluruh jadwal lalu merekonsiliasi
  notifikasi (batalkan yang usang, jadwalkan yang belum ada) tanpa pernah memakai `cancelAllScheduledNotificationsAsync`.
  Data SQLite tidak pernah diubah oleh kegagalan notifikasi.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [PRD.md](./PRD.md) | Kebutuhan produk, kriteria penerimaan, batasan produk, roadmap |
| [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | Status nyata per fitur, pengujian yang sudah/belum dilakukan, masalah diketahui |
| [DESIGN_BRIEF.md](./DESIGN_BRIEF.md) | Sumber kebenaran visual + blok design token |
| [ANDROID_TESTING.md](./ANDROID_TESTING.md) | Cara build APK lewat EAS dan checklist uji di HP Android |
| [AGENTS.md](./AGENTS.md) | Aturan kerja untuk agen/robot coding |

## Status singkat

- **Selesai di kode:** fondasi Expo & design token, lapisan SQLite (skema v2 + migrasi + seed), layar Hari Ini,
  CRUD jadwal dan tugas, dan notifikasi lokal pengingat kelas. Layar kelola mata kuliah belum ada.
- **Selesai di kode + test:** 191 test permanen di `tests/` (`npm test`) menutup lapisan database, CRUD,
  pengolahan waktu, validasi, klasifikasi izin/modul notifikasi, channel Android, dan sinkronisasi.
- **Belum diuji:** runtime Android (belum ada build/APK dari repo ini) dan iOS.

Implementasi dan pengujian dipisah: seluruh fitur sudah ada di kode dan teruji di lapisan data/logika,
tetapi **belum diverifikasi pada APK/perangkat**. Pengingat kelas **belum** dapat dinyatakan berjalan di
Android: trigger mingguan, channel, dialog izin, dan perilaku saat aplikasi ditutup hanya bisa dibuktikan
di perangkat — checklistnya ada di [ANDROID_TESTING.md](./ANDROID_TESTING.md) §5.

Rincian per fitur dan hasil perintah ada di [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md).

## Menjalankan

Prasyarat: **Node.js >= 22.18.0** dan npm. Tidak perlu Android Studio, JDK, SDK, atau `adb` — build
Android dibuat lewat EAS Build (lihat [ANDROID_TESTING.md](./ANDROID_TESTING.md)).

```bash
npm ci                # pasang dependency dari package-lock.json
npx expo start        # dev server (Expo Go untuk layar/JS saja)
npx expo start --dev-client   # setelah dev build EAS terpasang, untuk modul native

npm test              # test suite (191 test, Node >= 22.18.0, tanpa dependency tambahan)
npx tsc --noEmit      # typecheck
npx expo lint         # lint
```

Catatan menjalankan aplikasi:

- **Expo Go cukup untuk memeriksa tampilan dan alur JS**, tetapi **tidak** memuat `expo-notifications`
  maupun `@react-native-community/datetimepicker`. Untuk menguji pengingat dan picker tanggal perlu
  **dev build EAS** (`--profile development`) atau APK `preview`.
- Bila modul notifikasi tidak ada di build, aplikasi **tidak crash**: status pengingat menjadi
  "tidak tersedia di build ini" dan CRUD jadwal tetap berjalan (D6).
- **SQLite butuh modul native.** Di web, `expo-sqlite` memerlukan header COOP/COEP yang tidak dikirim
  dev server Metro, sehingga data kemungkinan gagal dimuat. Web bukan target produk.

Test dijalankan langsung dari sumber TypeScript (type-stripping bawaan Node), memakai `node:test` dan
`node:sqlite` — tidak ada Jest/Vitest.

**Syarat Node: `>= 22.18.0`.** Sejak 22.18.0 type-stripping `.ts` menyala secara default, dan sejak 22.13.0
`node:sqlite` tidak lagi butuh flag, sehingga `npm test` berjalan tanpa flag tambahan selain penekan
peringatan (`--disable-warning=...`). Versi Node yang lebih lama akan berhenti dengan pesan jelas dari
`tests/support/setup.mjs`. Aplikasi Android/iOS sendiri tidak bergantung pada versi Node ini.

Rincian cakupan, batas mocking, dan perintah per domain ada di
[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) §5.1.

Build APK Android dilakukan lewat EAS Build — lihat [ANDROID_TESTING.md](./ANDROID_TESTING.md).
Web bukan target produk: SQLite di browser butuh header COOP/COEP yang tidak dikirim dev server Metro.

## Struktur

```
src/app/            route Expo Router
                      _layout.tsx   SafeAreaProvider + SQLiteProvider (menjalankan migrasi)
                      index.tsx     "/"        → layar Hari Ini
                      jadwal/       "/jadwal", "/jadwal/baru", "/jadwal/[id]"
                      tugas/        "/tugas",  "/tugas/baru",  "/tugas/[id]"
components/         tampilan: TodayScreen, NextClassCard, SchedulesScreen, TaskFormScreen,
                    ReminderStatusCard, komponen UI bersama (Button, ChipRow, FormField, ...)
db/                 skema (v2), migrasi, seed, dan seluruh akses SQLite
                      schema.ts  database.ts  schedules.ts  tasks.ts  courses.ts  seed.ts  types.ts
hooks/              pembacaan data & waktu untuk layar (useTodayData, useReminderStatus, useFocusQuery)
lib/                logika murni + batas native
                      tokens.ts    satu-satunya sumber nilai visual
                      time.ts      format & perhitungan waktu
                      validation.ts validator form
                      classReminders.ts    slot pengingat, fingerprint, rekonsiliasi (murni)
                      notifications.ts     channel, izin, handler (batas expo-notifications)
                      notificationScheduler.ts  jadwalkan/baca/batalkan
                      notificationSync.ts       rekonsiliasi SQLite ⇄ notifikasi
theme/              logika light/dark (nilai visual tetap dari lib/tokens.ts)
tests/              test suite permanen
                      db/       test lapisan database & CRUD
                      lib/      test logika, izin/klasifikasi notifikasi, sinkronisasi
                      support/  infrastruktur uji (hook resolusi, adaptor node:sqlite,
                                fixture DB, tiruan react-native & expo-notifications)
assets/images/      ikon, adaptive icon, splash, favicon
app.json            konfigurasi Expo (nama, slug, package Android, plugin)
eas.json            profil build EAS: development / preview / production
```

Dokumen: `PRD.md` (kebutuhan), `DESIGN_BRIEF.md` (visual), `IMPLEMENTATION_STATUS.md` (status nyata),
`ANDROID_TESTING.md` (build & checklist perangkat), `AGENTS.md` (aturan kerja agen).
