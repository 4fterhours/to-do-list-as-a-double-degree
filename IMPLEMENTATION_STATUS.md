# Status Implementasi — Kelas Hari Ini

**Dokumen ini menjawab satu pertanyaan: apa yang benar-benar ada di kode sekarang, dan sejauh mana sudah diuji.**
Semua status di bawah berasal dari pemeriksaan file dan perintah yang dijalankan, bukan dari laporan tahap sebelumnya.

| | |
|---|---|
| Terakhir diperbarui | **2026-10-29** (Tahap 5B — finalisasi CRUD & dokumentasi) |
| Tahap saat ini | **CRUD + migrasi v2 selesai di kode, menunggu review** (posisi 4 roadmap `PRD.md`; disebut "Tahap 5" dalam percakapan). **Uji native Android belum dimulai.** |
| Kode terakhir diverifikasi | `npx tsc --noEmit` 0 · `npx expo lint` 0 · `npx expo export --platform android` 0 |
| Pengujian di perangkat | **Belum pernah dilakukan** (tidak ada build/APK) |

Legenda status:

| Status | Arti |
|---|---|
| `SELESAI` | Ada di kode dan lolos pemeriksaan statis/uji lapisan data yang tercatat di §5 |
| `SEBAGIAN` | Sebagian ada di kode, atau ada tetapi tidak memenuhi seluruh kriteria PRD |
| `BELUM DIMULAI` | Tidak ada kode/perilaku sama sekali |
| `BELUM DIUJI` | Kode ada, tetapi belum pernah dijalankan di perangkat/emulator nyata |
| `TIDAK BERLAKU` | Di luar ruang lingkup produk saat ini |

> **Konflik penomoran tahap (dibiarkan terbuka, tidak diputuskan diam-diam).**
> `PRD.md` §11 menomori: 4 = CRUD mata kuliah/jadwal/tugas, 5 = uji native Android, 6 = notifikasi.
> Percakapan proyek (dan laporan sesi sebelumnya) memakai: 4 = build EAS, **5 = CRUD + migrasi v2**.
> Di dokumen ini status selalu ditulis **berdasarkan nama pekerjaan**, bukan nomor, agar tidak salah baca.
> Padanan: "Tahap 5 — CRUD" (percakapan) = **posisi 4** pada roadmap PRD; "uji native Android" = **posisi 5**.

---

## 1. Ringkasan

- Aplikasi sudah memiliki **layar Hari Ini** lengkap dengan DB nyata (tahap 1–3).
- **CRUD jadwal dan tugas sudah tertulis penuh** (tahap 4): daftar, form tambah, form ubah, hapus berkonfirmasi, tandai selesai/buka kembali, relasi mata kuliah.
- **Migrasi skema v1 → v2 sudah ada** (tabel `courses` + `course_id`), aditif dan sudah diuji pada salinan database.
- **Audit CRUD Tahap 5B sudah diperbaiki:** `course_id` tanpa sentinel `0`, jadwal duplikat ditolak dengan pesan ramah, dan pemilihan mata kuliah lewat chip (bukan teks bebas) agar identitas tidak terpecah.
- **Belum ada satu pun pengujian di perangkat.** Belum ada build EAS yang berhasil karena sandbox tidak dapat menjangkau `api.expo.dev` dan belum ada sesi Expo.
- **Notifikasi lokal belum dimulai**; `expo-notifications` belum terpasang.
- Seluruh pekerjaan tahap 3–4 beserta perbaikan Tahap 5B **belum di-commit** (menunggu review).

### 1.1 Status implementasi ≠ status pengujian

Dua kolom ini **tidak boleh dibaca sebagai satu status**. Ringkasnya:

| Lapisan | Status | Bukti / dasar |
|---|---|---|
| **Implementasi kode** (Hari Ini, jadwal, tugas, relasi mata kuliah) | Ditulis lengkap | File ada dan lolos `tsc` + `lint` + bundling Android (§5 no. 1–3) |
| **Logika data** (migrasi v1→v2, CRUD, seed, validasi, duplikat) | Teruji pada SQLite nyata | Harness 66/66 + 33/33, **di luar** aplikasi (§5 no. 4–5) |
| **UI di perangkat** (semua layar, form, picker tanggal, dark mode, font besar) | **BELUM DIUJI** | Belum pernah ada APK build/terpasang (§6) |
| **Fitur notifikasi lokal** | **BELUM DIMULAI** | Tidak ada `expo-notifications`, tidak ada kode |

Artinya: CRUD **sudah ada di kode**, tetapi **belum terverifikasi pada APK/perangkat**. Jangan menaikkan status UI menjadi `SELESAI` sebelum build EAS yang memuat kode ini dipasang dan checklist `ANDROID_TESTING.md` dijalankan.

---

## 2. Referensi repository

| Item | Nilai |
|---|---|
| Branch kerja | `arena/172d2bcb-to-do-list-as-a-double-degree` |
| Commit terakhir | `5f8d788` — *feat: Hari Ini screen with SQLite layer, tokens, and EAS build config* |
| Commit sebelumnya | `1b6d5ca` — *Initial commit* |
| Remote | `https://github.com/4fterhours/to-do-list-as-a-double-degree.git` |
| Working tree | **Kotor** — 16 file berubah + 18 entri baru (belum di-commit); termasuk 4 file dokumentasi |
| Runtime | Node 22.22.3 · npm 10.9.8 · Expo 58.0.19 · React Native 0.88.0 · TypeScript 6.0.3 · SQLite 3.51.3 (uji) |

File yang belum di-commit (per pemeriksaan terakhir):

- **Berubah (kode/konfigurasi, 12):** `components/NextClassCard.tsx`, `components/TodayScreen.tsx`, `db/database.ts`, `db/schedules.ts`, `db/schema.ts`, `db/tasks.ts`, `db/types.ts`, `hooks/useTodayData.ts`, `package.json`, `package-lock.json`, `src/app/_layout.tsx`, `src/app/index.tsx`
- **Berubah (dokumentasi, 4):** `ANDROID_TESTING.md`, `DESIGN_BRIEF.md`, `AGENTS.md`, `README.md`
- **Baru (kode, 16 entri):** `components/{Buttons,ChipRow,ConfirmDialog,DateTimeField,FormField,ScreenHeader,TextField,ScheduleFormScreen,SchedulesScreen,TaskFormScreen,TasksScreen}.tsx`, `db/courses.ts`, `hooks/useFocusQuery.ts`, `lib/validation.ts`, `src/app/jadwal/{index,baru,[id]}.tsx`, `src/app/tugas/{index,baru,[id]}.tsx`
- **Baru (dokumentasi, 2):** `PRD.md`, `IMPLEMENTATION_STATUS.md`

Seluruh perubahan di atas berasal dari pekerjaan tahap 1–4 ditambah **Tahap 5B** (perbaikan audit CRUD + pembaruan dokumentasi) pada 2026-10-29. Tahap 5B mengubah kode hanya pada tiga titik: `db/types.ts` (tipe `courseId`), `db/schedules.ts` (deteksi duplikat + tanpa sentinel `0`), dan `components/ScheduleFormScreen.tsx` (pemilih mata kuliah); sisanya dokumentasi. **Tidak ada** checkout/reset/clean, tidak ada perubahan skema, seed, dependency, atau konfigurasi build.

> Catatan: workspace ini dapat "mundur" ke commit lama di antara sesi. Jika `git status` tampak kosong padahal pekerjaan tahap 3–4 seharusnya ada, periksa `git fetch` + bandingkan dengan `origin/<branch>`; **jangan** `reset --hard`.

---

## 3. Status fitur (dipetakan ke `PRD.md`)

### 3.1 Hari Ini

| ID PRD | Fitur | Status kode | Status uji |
|---|---|---|---|
| FR-A1 | Kelas berikutnya / sedang berlangsung (label + jam selesai) | `SELESAI` — `TodayScreen`, `NextClassCard`, `lib/time.ts:getClassTiming` | `BELUM DIUJI` (perangkat) |
| FR-A2 | Nama, jam, ruang, hitung mundur | `SELESAI` | `BELUM DIUJI` |
| FR-A3 | Jumlah kelas tersisa | `SELESAI` — `RemainingClasses` + `getRemainingClasses` | `BELUM DIUJI` |
| FR-A4 | Tugas belum selesai urut deadline | `SELESAI` — `getPendingTasks` (`ORDER BY deadline_at ASC`) | `SELESAI` (uji lapisan data) |
| FR-A5 | Baris tugas: mata kuliah, judul, tanggal, badge | `SELESAI` — `TaskRow`, `StatusLabel` | `BELUM DIUJI` |
| FR-A6 | State loading/error/kosong/terlambat/judul panjang | `SELESAI` — `ContentSkeleton`, `ReadErrorMessage`, `NoTasks`, badge overdue, judul wrap tanpa ellipsis | `BELUM DIUJI` |
| FR-A7 | Waktu lokal, tick 30 detik, refetch saat aktif/pergantian hari | `SELESAI` — `hooks/useTodayData.ts` | `BELUM DIUJI` |
| FR-A8 | Akses ke pengelolaan Jadwal & Tugas | `SELESAI` — `ManageLinks` di bawah tanggal | `BELUM DIUJI` |
| FR-A9 | Baca ulang saat layar kembali fokus | `SELESAI` — `useFocusEffect` di `useTodayData` | `BELUM DIUJI` |

### 3.2 Jadwal & mata kuliah

| ID PRD | Fitur | Status kode | Status uji |
|---|---|---|---|
| FR-B1 | Identitas mata kuliah konsisten | `SELESAI` — tabel `courses` + `course_id` (v2) + pemilih chip di form jadwal (tidak ada teks bebas yang bisa memecah identitas) | `SELESAI` (uji lapisan data) · `BELUM DIUJI` (UI) |
| FR-B2 | Jadwal mingguan: hari, jam, ruang, pengingat | `SELESAI` | `SELESAI` (DB) |
| FR-B3 | Lihat / tambah / ubah / hapus jadwal | `SELESAI` — `SchedulesScreen`, `ScheduleFormScreen`, route `/jadwal*` | `SELESAI` (DB) · `BELUM DIUJI` (UI) |
| FR-B5a | Jadwal duplikat (mata kuliah + hari + jam mulai sama) ditolak | `SELESAI` — `DuplicateScheduleError` di `db/schedules.ts`, pesan tampil di form | `SELESAI` (DB) · `BELUM DIUJI` (UI) |
| FR-B4 | Konfirmasi hapus | `SELESAI` — `ConfirmDialog` | `BELUM DIUJI` |
| FR-B5 | Validasi form jadwal | `SELESAI` — `lib/validation.ts` | `SELESAI` (unit) |
| FR-B6 | Perubahan jadwal tampil di Hari Ini | `SELESAI` — refetch saat fokus | `SELESAI` (DB) · `BELUM DIUJI` (UI) |
| FR-B7 | Layar kelola mata kuliah (daftar/ubah nama/hapus) | `BELUM DIMULAI` — belum diminta; mata kuliah dipilih/dibuat dari form jadwal dan dibersihkan otomatis bila tidak dipakai. **Ganti nama identitas belum ada** (lihat K1) | — |

### 3.3 Tugas

| ID PRD | Fitur | Status kode | Status uji |
|---|---|---|---|
| FR-C1 | Judul, deadline, status, relasi opsional | `SELESAI` | `SELESAI` (DB) |
| FR-C2 | Lihat / tambah / ubah / hapus | `SELESAI` — `TasksScreen`, `TaskFormScreen`, route `/tugas*` | `SELESAI` (DB) · `BELUM DIUJI` (UI) |
| FR-C3 | Tandai selesai / buka kembali | `SELESAI` — `setTaskCompleted` | `SELESAI` (DB) · `BELUM DIUJI` (UI) |
| FR-C4 | Tugas selesai tidak tampil di Hari Ini, buka kembali memulihkan urutan | `SELESAI` | `SELESAI` (DB) |
| FR-C5 | Pilih & kosongkan relasi mata kuliah | `SELESAI` — `ChipRow` dengan `allowDeselect` | `SELESAI` (DB) · `BELUM DIUJI` (UI) |
| FR-C6 | Urutan deadline, terlambat diprioritaskan | `SELESAI` | `SELESAI` (DB) |
| FR-C7 | Persistensi setelah aplikasi ditutup | `SELESAI` — koneksi file + migrasi idempoten | `SELESAI` (DB, buka-tutup koneksi) · `BELUM DIUJI` (aplikasi nyata) |
| FR-C8 | Konfirmasi hapus tugas | `SELESAI` | `BELUM DIUJI` |
| FR-C9 | Validasi form tugas | `SELESAI` | `SELESAI` (unit) |

### 3.4 Notifikasi

| ID PRD | Fitur | Status |
|---|---|---|
| FR-D1 | Menit pengingat dapat disimpan & diedit | `SELESAI` (tersimpan di DB; dapat diubah di form jadwal) |
| FR-D2 | Notifikasi lokal terjadwal | `BELUM DIMULAI` — `expo-notifications` tidak ada di `package.json`, tidak ada kode notifikasi (grep bersih) |
| FR-D3 | Tanpa push dari server | `SELESAI` (tidak ada kode jaringan sama sekali) |
| FR-D4 | Tidak mengklaim notifikasi selesai sebelum diuji | Dipatuhi |

### 3.5 Platform

| Platform | Status |
|---|---|
| Android | Kode siap; **build & uji perangkat belum ada**. Project ID EAS belum terisi di `app.json` (perlu `eas init` di mesin Anda). |
| iOS | `BELUM DIUJI` — kompatibel secara kode, belum pernah dijalankan |
| Web | `SEBAGIAN` — bukan target. SQLite di browser butuh COOP/COEP (server dev Metro tidak mengirimnya); picker tanggal native tidak tersedia sehingga form memakai isian teks `DD/MM/YYYY` dan `HH:mm` |

---

## 4. Peta kode (kondisi aktual)

| Path | Isi |
|---|---|
| `src/app/_layout.tsx` | `SafeAreaProvider`, `StatusBar`, `DatabaseErrorBoundary`, `SQLiteProvider` (menjalankan migrasi), `Stack` tanpa header |
| `src/app/index.tsx` | Route `/` → `TodayScreen` |
| `src/app/jadwal/{index,baru,[id]}.tsx` | Route daftar / tambah / ubah jadwal |
| `src/app/tugas/{index,baru,[id]}.tsx` | Route daftar / tambah / ubah tugas |
| `components/TodayScreen.tsx` (386) | Layar Hari Ini: header, tautan pengelolaan, kartu, ringkasan, daftar tugas, state kosong/loading/error |
| `components/NextClassCard.tsx` (183) | Kartu kelas berikutnya / berlangsung / selesai |
| `components/RemainingClasses.tsx` (74) | Ringkasan jumlah kelas tersisa |
| `components/TaskRow.tsx` (91), `StatusLabel.tsx` (44) | Baris tugas + badge status bertekstual |
| `components/SchedulesScreen.tsx` (249), `ScheduleFormScreen.tsx` (537) | Daftar & form jadwal: pemilih mata kuliah (chip), validasi, hapus berkonfirmasi, pesan jadwal duplikat |
| `components/TasksScreen.tsx` (292), `TaskFormScreen.tsx` (354) | Daftar & form tugas (termasuk selesai/buka kembali) |
| `components/{ScreenHeader,FormField,TextField,ChipRow,DateTimeField,Buttons,ConfirmDialog}.tsx` | Komponen UI bersama |
| `components/DatabaseErrorBoundary.tsx` (74) | Menangkap kegagalan inisialisasi database |
| `db/schema.ts` (119) | `SCHEMA_VERSION = 2`, `SCHEMA_V1_SQL`, `SCHEMA_V2_SQL`, `DEADLINE_SOON_MS` |
| `db/database.ts` (140) | `DATABASE_NAME`, `MIGRATIONS`, `migrate`, `enableForeignKeys`, `initializeDatabase` |
| `db/seed.ts` (169) | Data contoh v1 (4 jadwal, 4 tugas) — idempoten |
| `db/courses.ts` (64) | `listCourses`, `findOrCreateCourse`, `deleteUnusedCourses` |
| `db/schedules.ts` (237) | Baca/tulis jadwal; `DuplicateScheduleError` + cek bentrok; tetap menulis `course_name` warisan |
| `db/tasks.ts` (126) | Baca/tulis tugas; nama mata kuliah via `COALESCE(courses.name, schedules.course_name)` |
| `db/types.ts` (58) | `Course`, `Schedule` (`courseId: number | null`), `Task` |
| `hooks/useTodayData.ts` (123) | Data Hari Ini + jam berjalan + refetch saat fokus/aktif/pergantian hari |
| `hooks/useFocusQuery.ts` (71) | Query generik yang dibaca ulang saat layar fokus |
| `lib/time.ts` (277) | Fungsi waktu murni: format, countdown, status kelas, tone deadline |
| `lib/tokens.ts` (114) | Satu-satunya sumber nilai visual |
| `lib/validation.ts` (182) | Validator form murni (jadwal & tugas) |
| `theme/useTheme.ts` (31) | Pemilihan tema dari `useColorScheme()` |
| `PRD.md`, `DESIGN_BRIEF.md`, `ANDROID_TESTING.md`, `AGENTS.md` | Dokumen acuan |

---

## 5. Pengujian yang sudah dijalankan (beserta konteks)

Semua dijalankan di **sandbox Linux**, **bukan** di perangkat Android.

| # | Pemeriksaan | Perintah | Hasil | Konteks |
|---|---|---|---|---|
| 1 | TypeScript | `npx tsc --noEmit` | **exit 0**, tanpa keluaran | 2026-10-29, `node_modules` terpasang (`npm ci`) |
| 2 | Lint | `npx expo lint` | **exit 0**, 0 error 0 warning | 2026-10-29 |
| 3 | Bundling Android | `npx expo export --platform android` | **exit 0** — 1 bundle `entry-3fbf2f5…hbc` (3,2 MB), `Exported: dist` | 2026-10-29, Tahap 5B; dijalankan 3× (sebelum/sesudah perbaikan & sesudah komentar), semuanya exit 0 |
| 4 | Uji lapisan data (SQLite nyata) — dasar | harness Node + `node:sqlite` 3.51.3, TZ `Asia/Jakarta` | **66/66 lulus** | 2026-10-29; dijalankan sebelum perbaikan 5B, lalu **diulang** setelah perbaikan (tetap 66/66). Uji persistensi memakai file `persist.db` tetap, jadi file itu harus dihapus lebih dulu agar skenario "tambah jadwal baru" tidak dianggap duplikat — artefak harness, bukan perilaku aplikasi |
| 5 | Uji lapisan data (SQLite nyata) — audit 5B | harness Node, TZ `Asia/Jakarta` | **33/33 lulus** | 2026-10-29, setelah perubahan `db/schedules.ts` & `db/types.ts` |
| 6 | Grep kepatuhan token | hex / `fontWeight` / angka literal di `components/`, `src/` | bersih (0 temuan) | 2026-10-29 |

> Kedua harness berada di `/tmp` dan **tidak** disimpan di repo, sehingga tidak dapat dijalankan ulang
> dari repository (lihat K7). Rinciannya ada di `ANDROID_TESTING.md` §1.

Cakupan uji #4 (bukti yang bisa dikutip, bukan jaminan runtime aplikasi):

- Migrasi database **v1 berisi data pengguna** → v2: seluruh kolom jadwal & tugas identik sebelum/sesudah; dua sesi mata kuliah yang sama menunjuk satu `course_id`; tugas warisan memperoleh `course_id`; tugas tanpa jadwal tetap `NULL`.
- Migrasi diulang dua kali: isi tabel dan `user_version` tidak berubah.
- CRUD jadwal: tambah, ubah, hapus, mata kuliah otomatis dibuat, nama beda kapitalisasi tidak menduplikasi.
- CRUD tugas: tambah (judul di-trim), ubah, hapus, pasang/kosongkan relasi.
- Selesai + buka kembali: tugas hilang dari daftar pending lalu kembali pada posisi deadline yang benar.
- Persistensi: tutup & buka ulang koneksi file — data hasil CRUD tetap ada, seed tidak berduplikasi (4 tetap 4), `user_version` = 2.
- 23 assert validasi form (nama, format jam, rentang jam, pengingat, hari, deadline, ruang).
- Integrasi waktu: tone `overdue` / `deadline` / `info` dan urutan deadline.

Cakupan uji #5 (audit Tahap 5B):

- `course_id` selalu bilangan bulat > 0 dan ada di tabel `courses`; `course_id = 0` **ditolak** foreign key sehingga tidak ada baris yang ditulis.
- Jadwal duplikat (mata kuliah sama, hari sama, jam mulai sama) ditolak dengan pesan ramah; nama beda kapitalisasi dianggap duplikat; hari berbeda atau mata kuliah berbeda tetap diterima; menyimpan ulang jadwal yang sama tidak dianggap bentrok dengan dirinya sendiri.
- Identitas mata kuliah: memindahkan **satu** sesi ke mata kuliah lain tidak menghapus identitas lama, tidak mengubah sesi lain, dan tugas tetap menempel pada identitas lama.
- Tugas tetap terhubung ke identitas walaupun **semua** sesi jadwal mata kuliah itu dihapus; deadline dan status selesai utuh.
- Perubahan CRUD langsung terbaca oleh query yang dipakai layar Hari Ini (`getSchedulesForDay`, `getPendingTasks`), termasuk efek selesai/buka kembali dan hapus.

> Kedua harness memakai `node:sqlite`, **bukan** `expo-sqlite` di Android. Keduanya membuktikan logika SQL & migrasi, bukan perilaku runtime aplikasi.

---

## 6. Pengujian yang belum dilakukan

| # | Belum diuji | Alasan / dampak |
|---|---|---|
| 1 | Build Android (EAS) | Sandbox tidak dapat menjangkau `api.expo.dev`; belum ada sesi Expo; `app.json` belum punya `extra.eas.projectId`. Build harus dijalankan dari mesin Anda (`ANDROID_TESTING.md`). |
| 2 | Aplikasi berjalan di Android 10 | Bergantung pada #1. Semua kriteria `AC-A*`, `AC-B1..B9` (UI), `AC-C1..C7` (UI) berstatus **BELUM DIUJI**. |
| 3 | Date/time picker native | `@react-native-community/datetimepicker` adalah modul native; perlu build baru dulu. Perilaku di perangkat belum pernah dilihat. |
| 4 | Light/dark mode di perangkat | Belum pernah dilihat di HP. |
| 5 | Font besar / fontScale, safe area, layar kecil (<360 dp) | Belum pernah diuji. |
| 6 | iOS | Belum pernah dijalankan. |
| 7 | Uji migrasi pada database aplikasi yang sudah ada di HP | Uji hanya pada database sintetis di sandbox. |
| 8 | Notifikasi lokal | Belum ada kode. |
| 9 | Uji otomatis yang tersimpan di repo | **Tidak ada test suite** di repository. |
| 10 | Skenario uji APK (CRUD, duplikat, picker, relasi mata kuliah, persistensi) | Daftar lengkap sudah disiapkan di `ANDROID_TESTING.md` §5, tetapi **belum dijalankan** — menunggu APK build EAS terbaru. |

---

## 7. Masalah yang diketahui & ketidaksesuaian dokumentasi

### 7.1 Ketidaksesuaian dokumen (Tahap 5B: sudah diperbaiki)

| # | Lokasi | Masalah | Status |
|---|---|---|---|
| D1 | `DESIGN_BRIEF.md` (kepala dokumen, §03, §12, §13) | Menyatakan "satu route, tanpa CRUD" tanpa menjelaskan cakupannya | **Selesai** — ditambahkan catatan cakupan: larangan itu mengikat mockup Hari Ini; layar pengelolaan adalah perluasan produk sesuai `PRD.md` §6.2–6.3, dengan spesifikasi visual lama tetap utuh |
| D2 | `ANDROID_TESTING.md` (checklist lama) | Masih menyebut "tidak ada CRUD" dan `PRAGMA user_version` = 1 | **Selesai** — dokumen ditulis ulang untuk CRUD, skema **v2**, picker native, dan pemisahan uji Node vs uji Android |
| D3 | `src/app/index.tsx` komentar | Menulis "tidak ada tab navigator atau route tambahan" | **Selesai** — komentar diperbarui (tab navigator tetap tidak ada; route `/jadwal*` & `/tugas*` dijelaskan) |
| D4 | `ANDROID_TESTING.md` tabel state | State "tidak ada tugas" disebut tidak tersedia dari seed | **Selesai** — panduan baru memakai CRUD pengguna untuk memunculkan state tersebut |

### 7.2 Keterbatasan perilaku

| # | Masalah | Dampak | Status |
|---|---|---|---|
| K1 | Ganti **nama** identitas mata kuliah belum tersedia; form jadwal memilih identitas yang ada atau membuat baru | Untuk mengganti nama identitas, pengguna harus membuat mata kuliah baru dan memindahkan setiap jadwalnya satu per satu; nama lama tetap ada selama masih dipakai tugas | **Sebagian** — risiko "identitas terpecah tanpa sengaja" sudah dihilangkan (chip pilihan, bukan teks bebas), tetapi penggantian nama identitas belum ada (FR-B7) |
| K2 | Jadwal duplikat hanya ditolak constraint SQLite | Dulu muncul pesan error mentah | **Selesai** — `DuplicateScheduleError` di `db/schedules.ts`: pesan berbahasa Indonesia, membandingkan nama tanpa membedakan kapitalisasi, dan tidak salah menandai baris yang sedang diubah sebagai duplikat |
| K3 | `schedules.course_name` masih ditulis sebagai salinan wajib (warisan `NOT NULL` + `UNIQUE`) | Dua sumber nama bisa berbeda bila data diubah manual di luar aplikasi | **Diterima** — pertahankan sampai ada migrasi v3 yang membangun ulang tabel |
| K4 | `tasks.schedule_id` masih ada dan terbaca sebagai cadangan label | Kolom warisan yang tidak dipakai UI | **Diterima** — didokumentasikan; kandidat pensiun pada migrasi berikutnya |
| K5 | `course_id` NULL dipetakan menjadi `0` | Sentinel 0 bukan id sah; berpotensi menyamarkan data yang belum ter-backfill | **Selesai** — `Schedule.courseId` bertipe `number | null`; nilai `0` tidak lagi diproduksi dan FK menolaknya |
| K6 | Tidak ada pengecekan izin/batas jumlah data | Wajar untuk pemakaian pribadi | **Diterima** |
| K7 | Tidak ada test suite di repo (harness hanya di `/tmp`) | Regresi hanya terdeteksi manual dan hasil uji lama tidak dapat direproduksi dari repo | **Terbuka** — pertimbangkan test runner ringan pada tahap 7 |
| K8 | Perilaku `@react-native-community/datetimepicker` di iOS belum pernah dijalankan (`display="default"` + tutup otomatis setelah memilih) | Bisa terasa kurang pas di iOS (platform berikutnya) | **Terbuka** — tinjau saat iOS menjadi target |

### 7.3 Batasan lingkungan sandbox (agar tidak diulang)

- `api.expo.dev`, `expo.dev`, `u.expo.dev` tidak terjangkau → `eas build`, `npx expo install`, `expo-doctor` online gagal.
- Tidak ada JDK/Android SDK/adb/emulator → tidak mungkin build atau menjalankan aplikasi Android lokal.
- `node_modules` tidak selalu terbawa antar sesi → jalankan `npm ci` lebih dulu sebelum `npx tsc`/`npx expo lint` (tanpa itu, npm akan mencoba memasang paket bernama sama dari registry dan gagal).
- `npx expo install` butuh jaringan → untuk dependency baru, cocokkan versi dengan `node_modules/expo/bundledNativeModules.json` lalu pakai `npm install <paket>@<versi>`.

---

## 8. Cara memperbarui dokumen ini

1. Perbarui setelah **setiap** tahap yang selesai (atau saat status berubah), bukan hanya saat diminta.
2. Ubah bagian yang benar-benar terdampak: §3 (status fitur), §5 (pengujian baru), §6 (yang masih belum diuji), §7 (masalah).
3. Tulis hasil perintah **apa adanya**, termasuk kegagalan. Jangan menaikkan status menjadi `SELESAI` tanpa bukti.
4. Bedakan dengan tegas: uji statis (tsc/lint/bundle), uji lapisan data (SQLite), dan uji runtime perangkat. Label konteksnya.
5. Jangan menuliskan token, kredensial, atau ID akun.
