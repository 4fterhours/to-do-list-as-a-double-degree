# Status Implementasi — Kelas Hari Ini

**Dokumen ini menjawab satu pertanyaan: apa yang benar-benar ada di kode sekarang, dan sejauh mana sudah diuji.**
Semua status di bawah berasal dari pemeriksaan file dan perintah yang dijalankan, bukan dari laporan tahap sebelumnya.

| | |
|---|---|
| Terakhir diperbarui | **2026-11-01** (Fase 3 — finalisasi dokumentasi & audit konfigurasi EAS) |
| Tahap saat ini | **Fase 3 selesai, menunggu review.** Tahap 6 (notifikasi) di-commit pada `de16009`; perubahan Fase 1 + Fase 2 + Fase 2A + Fase 3 belum di-commit. Tidak ada build/APK. |
| Kode terakhir diverifikasi | `npm test` **191/191** (41 suite) · `npx tsc --noEmit` 0 · `npx expo lint` 0 · `npx expo export --platform android` 0 |
| Pengujian di perangkat | CRUD: dilaporkan lulus oleh pengguna di emulator Android 10 (**tidak diverifikasi dari workspace ini**). Notifikasi: **BELUM DIUJI** — perlu dev build baru yang memuat `expo-notifications`. |

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
- **Belum ada satu pun pengujian di perangkat dari workspace ini.** Build EAS tidak dapat dijalankan di sandbox (tidak ada jaringan ke `api.expo.dev`, tidak ada sesi Expo).
- **Notifikasi lokal sudah ada di kode** (`expo-notifications`, channel, izin lewat aksi pengguna, rekonsiliasi idempoten) dan sudah di-commit pada `de16009`; **belum pernah dijalankan di perangkat.**
- **Fase 1 (2026-11-01)** menutup tiga temuan audit: urutan hari pada daftar jadwal (D3), umpan balik kegagalan sinkronisasi (D5), dan klasifikasi modul native yang tidak ada di build (D6). Rinciannya di §7.4.
- **Fase 2 (2026-11-01)** menambahkan **test suite permanen di repository** (`tests/`, `npm test`): 170 test, 36 suite, tanpa dependency baru. Harness sementara di `/tmp` tidak lagi menjadi sumber bukti (K7 ditutup).
- **Fase 2A (2026-11-01)** menutup temuan F2-1 (izin gagal dibaca tidak lagi dilaporkan sebagai penolakan izin), mengaudit kegagalan notification channel Android beserta test keputusannya, menaikkan syarat Node menjadi `>= 22.18.0`, dan menghapus flag `--experimental-sqlite` yang tidak lagi diperlukan. Jumlah test menjadi **191**. Rinciannya di §7.5 dan §7.6.
- **Fase 3 (2026-11-01)** menyamakan seluruh dokumentasi dengan kode aktual (README, PRD, ANDROID_TESTING, AGENTS, DESIGN_BRIEF) dan mengaudit konfigurasi EAS. **Tidak ada perubahan kode aplikasi, skema, token desain, atau dependency.** Rincian temuan ada di §7.7, status EAS di §9.
- Perubahan Fase 1, Fase 2, Fase 2A, dan Fase 3 **belum di-commit** (menunggu review).

### 1.1 Status implementasi ≠ status pengujian

Dua kolom ini **tidak boleh dibaca sebagai satu status**. Ringkasnya:

| Lapisan | Status | Bukti / dasar |
|---|---|---|
| **Implementasi kode** (Hari Ini, jadwal, tugas, relasi mata kuliah) | Ditulis lengkap | File ada dan lolos `tsc` + `lint` + bundling Android (§5 no. 1–3) |
| **Logika data** (migrasi v1→v2, CRUD, seed, validasi, duplikat) | Teruji pada SQLite nyata | Test suite permanen `npm test` — **39 test** domain database (§5.1) |
| **UI di perangkat** (semua layar, form, picker tanggal, dark mode, font besar) | **BELUM DIUJI** | Belum pernah ada APK build/terpasang (§6) |
| **Fitur notifikasi lokal** | Ditulis lengkap, teruji di logika | `lib/*` + test suite permanen — **90 test** notifikasi & sinkronisasi, **152 test** domain `lib` (§5.1); **tidak** membuktikan perilaku native |

Artinya: CRUD **sudah ada di kode**, tetapi **belum terverifikasi pada APK/perangkat**. Jangan menaikkan status UI menjadi `SELESAI` sebelum build EAS yang memuat kode ini dipasang dan checklist `ANDROID_TESTING.md` dijalankan.

---

## 2. Referensi repository

| Item | Nilai |
|---|---|
| Branch kerja | `arena/172d2bcb-to-do-list-as-a-double-degree` |
| HEAD | `de16009` — *feat: notifikasi lokal pengingat kelas dengan expo-notifications* (sama dengan remote) |
| Commit sebelumnya | `394fd77`, `5f8d788`, `1b6d5ca` |
| Remote | `https://github.com/4fterhours/to-do-list-as-a-double-degree.git` |
| Working tree | **Kotor, belum di-commit** — 14 berkas berubah + `tests/` (21 berkas) sebagai folder baru |
| Node minimum untuk test | 22.18.0 (terpasang 22.22.3 · npm 10.9.8) |
| Runtime aplikasi | Expo 58.0.19 · React Native 0.88.0 · TypeScript 6.0.3 · SQLite 3.51.3 (uji) |

### 2.1 Perubahan yang belum di-commit

Garis besar (rincian per berkas ada di git, bukan di dokumen ini):

| Kelompok | Berkas | Asal |
|---|---|---|
| **Kode — perbaikan Fase 1** | `db/schedules.ts` (D3), `components/SchedulesScreen.tsx` (D3), `lib/notifications.ts` (D6), `lib/classReminders.ts` (D6 + F2-1), `lib/notificationSync.ts` (D5 + F2-1), `hooks/useReminderStatus.ts` (D5/D6 + F2-1), `components/ReminderStatusCard.tsx` (D5/D6), `src/app/_layout.tsx` (D5), `components/ScheduleFormScreen.tsx` (D5) | Fase 1, disempurnakan Fase 2A |
| **Test — Fase 2 & 2A** | `tests/` (21 berkas: 15 berkas test + 6 berkas support) | Fase 2 (13 berkas) + Fase 2A (2 berkas) |
| **Konfigurasi** | `package.json` (script `test`, `test:db`, `test:lib`, `test:sync`; tanpa `--experimental-sqlite` sejak Fase 2A) | Fase 2 + Fase 2A |
| **Dokumentasi** | `README.md`, `AGENTS.md`, `ANDROID_TESTING.md`, `IMPLEMENTATION_STATUS.md` | Fase 1–3 |

**Tidak berubah sejak `de16009`:** skema & migrasi (`db/schema.ts`, `db/database.ts`), seed, seluruh CRUD
(`db/schedules.ts` hanya berubah pada klausa `ORDER BY`), `lib/tokens.ts`, `app.json`, `eas.json`,
`package-lock.json`, route, dan seluruh alur CRUD. Fase 3 sendiri **tidak mengubah satu baris kode aplikasi**.

> **Catatan workspace.** `.git` di sandbox ini dapat kembali ke `1b6d5ca` di antara sesi (clone ulang).
> Prosedur pemulihan yang dipakai dan aman — **setelah** memverifikasi setiap berkas di disk identik dengan
> remote: `git fetch` → buat branch backup → `git reset --mixed origin/<branch>`. **Jangan** `reset --hard`,
> `clean`, `revert`, atau menghapus berkas.

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

| ID PRD | Fitur | Status kode | Status uji |
|---|---|---|---|
| FR-D1 | Menit pengingat dapat disimpan & diedit | `SELESAI` (tersimpan di DB; dapat diubah di form jadwal) | `SELESAI` (uji lapisan data Tahap 5) |
| FR-D2 | Notifikasi lokal terjadwal | `SELESAI` — `lib/notificationSync.ts` + `lib/notificationScheduler.ts`; dipanggil setelah CRUD jadwal, saat app siap, dan saat app kembali aktif | `SELESAI` (logika: 90 test notifikasi & sinkronisasi di `npm test`) · **`BELUM DIUJI` di perangkat** |
| FR-D2a | Channel Android `class-reminders` (importance DEFAULT) | `SELESAI` — `ensureClassReminderChannel()` dipanggil sebelum izin & sebelum menjadwalkan | `BELUM DIUJI` (perangkat) |
| FR-D2b | Izin platform (Android 10/13+, iOS) + tombol "Aktifkan pengingat" | `SELESAI` — `useReminderStatus` + `ReminderStatusCard` di layar Jadwal. Fase 1 memisahkan lima keadaan: web tidak didukung, build tanpa modul native, izin belum ada, izin diblokir, penjadwalan gagal | `SELESAI` (logika, uji Fase 1 no. 10–12) · `BELUM DIUJI` (perangkat) |
| FR-D3 | Tanpa push dari server | `SELESAI` — tidak ada `getExpoPushTokenAsync`, FCM, atau kode jaringan (grep bersih) | `SELESAI` (inspeksi kode) |
| FR-D4 | Tidak mengklaim notifikasi selesai sebelum diuji | Dipatuhi: status perangkat tetap `BELUM DIUJI` | — |
| FR-D5 | `reminder_minutes = 0` = tepat saat kelas dimulai | `SELESAI` — `lib/classReminders.ts` menghitung slot 0 menit tanpa perlakuan khusus | `SELESAI` (logika, `tests/lib/classReminders.test.mjs`) |
| FR-D6 | Tanpa exact alarm, pengiriman best-effort | `SELESAI` — tidak ada `USE_EXACT_ALARM`; Android memakai `delivery: 'bestEffort'` | `SELESAI` (inspeksi kode) · ketepatan **tidak dapat diuji** tanpa perangkat (K9) |

### 3.5 Platform

| Platform | Status |
|---|---|
| Android | Kode siap; **build & uji perangkat belum ada**. `extra.eas.projectId` belum ada di `app.json` dan tidak dapat diverifikasi dari sandbox — lihat §9. |
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
| `components/TodayScreen.tsx` (388) | Layar Hari Ini: header, tautan pengelolaan, kartu, ringkasan, daftar tugas, state kosong/loading/error |
| `components/NextClassCard.tsx` (183) | Kartu kelas berikutnya / berlangsung / selesai |
| `components/RemainingClasses.tsx` (74) | Ringkasan jumlah kelas tersisa |
| `components/TaskRow.tsx` (91), `StatusLabel.tsx` (44) | Baris tugas + badge status bertekstual |
| `components/SchedulesScreen.tsx` (254), `ScheduleFormScreen.tsx` (545) | Daftar & form jadwal: pemilih mata kuliah (chip), validasi, hapus berkonfirmasi, pesan jadwal duplikat |
| `components/TasksScreen.tsx` (292), `TaskFormScreen.tsx` (354) | Daftar & form tugas (termasuk selesai/buka kembali) |
| `components/{ScreenHeader,FormField,TextField,ChipRow,DateTimeField,Buttons,ConfirmDialog}.tsx` | Komponen UI bersama |
| `components/DatabaseErrorBoundary.tsx` (74) | Menangkap kegagalan inisialisasi database |
| `db/schema.ts` (119) | `SCHEMA_VERSION = 2`, `SCHEMA_V1_SQL`, `SCHEMA_V2_SQL`, `DEADLINE_SOON_MS` |
| `db/database.ts` (140) | `DATABASE_NAME`, `MIGRATIONS`, `migrate`, `enableForeignKeys`, `initializeDatabase` |
| `db/seed.ts` (169) | Data contoh v1 (4 jadwal, 4 tugas) — idempoten |
| `db/courses.ts` (64) | `listCourses`, `findOrCreateCourse`, `deleteUnusedCourses` |
| `db/schedules.ts` (249) | Baca/tulis jadwal; `DuplicateScheduleError` + cek bentrok; tetap menulis `course_name` warisan |
| `db/tasks.ts` (126) | Baca/tulis tugas; nama mata kuliah via `COALESCE(courses.name, schedules.course_name)` |
| `db/types.ts` (58) | `Course`, `Schedule` (`courseId: number \| null`), `Task` |
| `hooks/useTodayData.ts` (123) | Data Hari Ini + jam berjalan + refetch saat fokus/aktif/pergantian hari |
| `hooks/useFocusQuery.ts` (71) | Query generik yang dibaca ulang saat layar fokus |
| `hooks/useReminderStatus.ts` (179) | Status pengingat untuk layar Jadwal (izin, jumlah aktif, aksi aktifasi) |
| `lib/classReminders.ts` (358) | **Murni**: konversi weekday, slot pengingat (lintas tengah malam), teks, fingerprint, rekonsiliasi |
| `lib/notifications.ts` (307) | Channel Android, izin, notification handler; no-op di web |
| `lib/notificationScheduler.ts` (138) | Jadwalkan/baca/batalkan notifikasi (WEEKLY di Android, CALENDAR di iOS) |
| `lib/notificationSync.ts` (213) | Rekonsiliasi SQLite ⇄ notifikasi; `syncClassReminders`, `enableClassReminders` |
| `components/ReminderStatusCard.tsx` (174) | Kartu status pengingat di layar Jadwal + tombol aktifasi |
| `lib/time.ts` (277) | Fungsi waktu murni: format, countdown, status kelas, tone deadline |
| `lib/tokens.ts` (114) | Satu-satunya sumber nilai visual |
| `lib/validation.ts` (182) | Validator form murni (jadwal & tugas) |
| `theme/useTheme.ts` (31) | Pemilihan tema dari `useColorScheme()` |
| `tests/support/*.mjs` (6) | Infrastruktur uji: `setup` (penjaga versi Node + shim `require`), hook resolusi, adaptor `node:sqlite`, fixture DB, tiruan `react-native` & `expo-notifications` |
| `tests/db/*.test.mjs` (5), `tests/lib/*.test.mjs` (10) | Test suite permanen — lihat §5.1 |
| `app.json` | Nama, slug `kelas-hari-ini`, `android.package` `com.afterhours.kelashariini` + `versionCode 1`, plugin `expo-dev-client`/`expo-router`/`expo-splash-screen`. **Tanpa** `extra.eas.projectId` — lihat §9 |
| `eas.json` | Profil `development` (dev client, APK internal), `preview` (APK internal), `production` (AAB); `appVersionSource: local` |
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
| 7 | Uji logika notifikasi (Node, `--experimental-strip-types`) | harness `/tmp/t6/notifications.test.mjs` | **67/67 lulus** di 4 zona waktu (`Asia/Jakarta`, `America/New_York`, `Europe/Berlin`, `Pacific/Kiritimati`) | 2026-10-30, Tahap 6 |
| 8 | Bundling Android setelah notifikasi | `npx expo export --platform android` | **exit 0** — `entry-261cbd1…hbc` (3,3 MB) | 2026-10-30 |
| 9 | Bundling web setelah notifikasi | `npx expo export --platform web` | **exit 0** — `Exported: /home/user/preview/web` | 2026-10-30 |

| 10 | Uji D3 — urutan daftar jadwal | harness `/tmp/f7/test-order.mjs` (SQLite nyata) | **7/7 lulus** | 2026-11-01, TZ `Asia/Jakarta`; 10 jadwal disisipkan acak → keluaran Senin…Minggu |
| 11 | Uji D5/D6 — sinkronisasi notifikasi | harness `/tmp/f7/test-sync.mjs` (scheduler + izin tiruan, `notificationSync.ts` asli) | **52/52 lulus** | 2026-11-01; sukses, idempoten, duplikat, izin ditolak, modul hilang, web, gagal jadwal, retry, hapus, yatim, tanpa unhandled rejection |
| 12 | Uji D6 — klasifikasi modul native | harness `/tmp/f7/test-notifications.mjs` (`lib/notifications.ts` asli, `react-native` & `expo-notifications` dipalsukan) | **37/37 lulus** | 2026-11-01; `unavailable` vs `unsupported` vs `ready`, channel, izin, handler, gerbang |
| 13 | Regresi audit (kode terbaru) | harness `/tmp/audit/audit.test.mjs`, salinan disegarkan dari kode Fase 1 | **28/28 lulus** | 2026-11-01; migrasi v1→v2, seed, CRUD jadwal/tugas, slot pengingat, rekonsiliasi |

> Baris #10–#13 adalah harness sementara **Fase 1** yang berada di `/tmp` dan sudah **digantikan** oleh test
> suite permanen di §5.1. Baris itu dipertahankan sebagai riwayat bukti, bukan sebagai cara menjalankan uji.

Pemeriksaan terkini (dijalankan ulang dari repository, bukan dari `/tmp`):

| # | Pemeriksaan | Perintah | Hasil | Konteks |
|---|---|---|---|---|
| 14 | Test suite permanen | `npm test` | **191/191 lulus**, 41 suite, exit 0 | 2026-11-01 Fase 3, Node 22.22.3 |
| 15 | TypeScript | `npx tsc --noEmit` | **exit 0**, tanpa keluaran | 2026-11-01 Fase 3, setelah `npm ci` |
| 16 | Lint | `npx expo lint` | **exit 0**, 0 error 0 warning | 2026-11-01 Fase 3 |
| 17 | Bundling Android | `npx expo export --platform android` | **exit 0** — `entry-1a208f2f7f46580cd649527fc6a958dd.hbc` (3,3 MB) | 2026-11-01 Fase 3 |
| 18 | Kepatuhan token | grep hex/`fontSize`/`fontWeight`/`borderRadius` literal di `components/`, `src/`, `hooks/` | **0 temuan** | 2026-11-01 Fase 3 |

> Hash bundel Android **berbeda** dari Fase 1 (`entry-1103c4d9…` → `entry-1a208f2f…`). Itu wajar: Fase 2A
> mengubah kode produksi (`lib/classReminders.ts`, `lib/notificationSync.ts`, `lib/notifications.ts`,
> `hooks/useReminderStatus.ts`). Pada Fase 2 hash identik **karena** saat itu tidak ada kode aplikasi yang
> disentuh. Fase 3 tidak mengubah kode aplikasi sama sekali.
> Yang diperiksa ulang pada Fase 2A: tidak ada jejak `tests/`/`node:test` di dalam bundel, dan pesan
> `PERMISSION_UNREADABLE_MESSAGE` memang ikut terpaket.

### 5.1 Test suite permanen (Fase 2, diperluas Fase 2A)

Seluruh pengujian penting kini berada **di dalam repository** dan dapat dijalankan ulang dengan satu perintah.
Tidak ada dependency pengujian baru: memakai `node:test` + `node:sqlite` bawaan Node dan type-stripping
bawaan Node (`.ts` dijalankan langsung tanpa build step, tanpa Jest/Vitest/babel).

**Syarat Node: `>= 22.18.0`** — versi pertama dengan type-stripping `.ts` menyala secara default. Sejak
22.13.0 `node:sqlite` juga tidak lagi butuh flag, sehingga script hanya memakai penekan peringatan
(`--disable-warning=MODULE_TYPELESS_PACKAGE_JSON`, `--disable-warning=ExperimentalWarning`).
`tests/support/setup.mjs` memeriksa versi Node dan berhenti dengan pesan jelas bila terlalu lama.

| Perintah | Cakupan |
|---|---|
| `npm test` | seluruh suite (`tests/**/*.test.mjs`) |
| `npm run test:db` | domain database & CRUD (`tests/db/`) |
| `npm run test:lib` | domain logika murni + notifikasi (`tests/lib/`) |
| `npm run test:sync` | khusus notifikasi (`tests/lib/notif*.test.mjs`) |

**Hasil terakhir: 191 test lulus, 0 gagal, 41 suite** (`npm test`, 2026-11-01, Fase 3 — dijalankan ulang dari repository).

| File | Domain | Jumlah |
|---|---|---|
| `tests/db/migration.test.mjs` | pembuatan DB, migrasi v1→v2, keutuhan data, idempotensi, rollback, versi lebih baru | 8 |
| `tests/db/seed.test.mjs` | seed 4/4, tidak menggandakan (AC-E1), tidak menimpa perubahan, tidak dijalankan pada DB lama | 4 |
| `tests/db/persistence.test.mjs` | tutup–buka ulang koneksi, relasi mata kuliah ↔ jadwal ↔ tugas | 5 |
| `tests/db/schedules.test.mjs` | CRUD jadwal, duplikat, pengecualian diri sendiri, **urutan Senin → Minggu (D3)** | 12 |
| `tests/db/tasks.test.mjs` | CRUD tugas, relasi, selesai/buka kembali, urutan deadline, pending | 10 |
| `tests/lib/time.test.mjs` | jam, pergantian hari/minggu, status kelas, sisa kelas, deadline, durasi | 20 |
| `tests/lib/validation.test.mjs` | judul, jam, rentang, pengingat, hari, deadline, ruang, gabungan form | 14 |
| `tests/lib/classReminders.test.mjs` | konversi hari, slot pengingat (0/1440/lintas tengah malam), isi, fingerprint, gerbang, rekonsiliasi | 28 |
| `tests/lib/notifications-ready.test.mjs` | modul tersedia: izin granted/denied/blocked/gagal baca, channel, urutan channel→izin, handler | 12 |
| `tests/lib/notifications-unavailable.test.mjs` | build tanpa modul native (`unavailable` vs `unsupported`) | 8 |
| `tests/lib/notificationSync.test.mjs` | sinkronisasi end-to-end di atas SQLite nyata: sukses, idempoten, tambah/ubah/hapus, yatim, duplikat, cabang iOS vs Android, lintas tengah malam, kegagalan, retry, tanpa unhandled rejection | 29 |
| `tests/lib/notificationSync-unavailable.test.mjs` | sinkronisasi saat modul tidak ada / web; CRUD tetap jalan | 6 |
| `tests/lib/notificationSync-faults.test.mjs` | **K12**: kegagalan sebelum vs sesudah pembatalan, pemulihan | 14 |
| `tests/lib/notificationSync-permission.test.mjs` | **F2-1**: izin gagal dibaca vs izin ditolak (sync dan aksi "Aktifkan pengingat"), pemulihan, tanpa unhandled rejection | 11 |
| `tests/lib/notificationSync-channel.test.mjs` | **audit channel**: channel dibuat sebelum penjadwalan, iOS tidak membuat channel, kegagalan channel tidak membatalkan/menduplikasi dan `channelId` tetap dikirim | 10 |

**Cara kerja mocking (batas yang dipalsukan saja):**

| Batas | Pengganti | Alasan |
|---|---|---|
| `react-native` | `tests/support/native/react-native.mjs` (hanya `Platform.OS`) | modul native RN tidak dapat dimuat di Node |
| `expo-notifications` | `tests/support/native/expo-notifications.mjs` (penyimpanan di memori + fault injection) | modul native + tidak ada perangkat |
| `expo-sqlite` | `tests/support/sqlite.mjs` (adaptor `node:sqlite` dengan API yang sama) | driver native, bukan SQLite mesin berbeda |

Kode aplikasi (`db/*.ts`, `lib/*.ts`) **diimpor langsung** dari repository — tidak ada salinan logika di test.
Resolusi import tanpa ekstensi (`from './time'`) ditangani `tests/support/resolve-hook.mjs`.

**Batasan yang tetap ada:** komponen React (`components/*.tsx`) dan hook (`hooks/*.ts`) **tidak** tercakup,
karena membutuhkan DOM/renderer React Native yang tidak tersedia tanpa menambah dependency baru. Perubahan
pada `hooks/useReminderStatus.ts` (pemetaan status ke UI) karenanya hanya diverifikasi lewat `tsc`.

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

Cakupan uji #7 (logika notifikasi, tanpa perangkat):

- Konversi weekday DB (0=Minggu … 6=Sabtu) ⇄ expo (1=Minggu … 7=Sabtu), termasuk penolakan nilai di luar rentang.
- Slot pengingat: kelas 10:00 dengan 15/60/0 menit; kelas 00:05 dengan 5 menit.
- Lintas tengah malam: Senin 07:00 − 600 = **Minggu 21:00**; Senin 00:30 − 45 = **Minggu 23:45**; Minggu 00:15 − 30 = **Sabtu 23:45**; Rabu 00:00 − 1 menit = **Selasa 23:59**.
- Batas 24 jam: Senin 10:00 − 1440 = **Minggu 10:00**; Minggu − 1440 = Sabtu.
- Sapuan 7 hari × 1441 nilai pengingat → semua slot (weekday 1–7, jam 0–23, menit 0–59) sah.
- Isi notifikasi dengan ruang / tanpa ruang / ruang berisi spasi.
- Fingerprint berubah bila jam, hari, pengingat, ruang, atau nama berubah; **tidak** berubah bila `endTime` berubah.
- Sinkronisasi memakai scheduler palsu: tambah (1 notifikasi), ubah jam (identifier lama dibatalkan), ubah ruang/pengingat, hapus (0 notifikasi), 5× buka aplikasi (tetap 1, identifier sama), 3 duplikat → 1 tersisa, notifikasi yatim dibatalkan, metadata rusak dibatalkan.
- Dua sesi mata kuliah yang sama → dua notifikasi; menghapus satu sesi tidak mengganggu yang lain.
- Gerbang izin: `proceed` / `permission-denied` / `unsupported`.

> Harness ini **tidak** memuat `expo-notifications` maupun `react-native`; ia membuktikan perhitungan dan logika rekonsiliasi, **bukan** perilaku notifikasi native.

> Kedua harness lapisan data (Tahap 5) memakai `node:sqlite`, **bukan** `expo-sqlite` di Android. Keduanya membuktikan logika SQL & migrasi, bukan perilaku runtime aplikasi.

---

## 6. Pengujian yang belum dilakukan

Seluruh butir di bawah **hanya** dapat ditutup dengan membangun APK lewat EAS lalu menjalankannya di
perangkat/emulator. Urutan penutupannya mengikuti `ANDROID_TESTING.md` §5.

| # | Belum diuji | Alasan / dampak | Checklist |
|---|---|---|---|
| 1 | Build Android (EAS) | Sandbox tidak dapat menjangkau `api.expo.dev` (TLS ditolak) dan tidak punya sesi Expo; `app.json` di repo ini belum punya `extra.eas.projectId` (lihat §9). Build harus dijalankan dari mesin Anda | `ANDROID_TESTING.md` §3 |
| 2 | Dev build baru yang memuat `expo-notifications` dan `@react-native-community/datetimepicker` | Keduanya modul native; dev client/APK lama tidak memuatnya, sehingga notifikasi & picker tidak bisa diuji sebelum APK baru dipasang | `ANDROID_TESTING.md` §3 |
| 3 | Aplikasi berjalan di Android 10 | Bergantung pada #1. Semua `AC-A*`, `AC-B1..B9` (UI), `AC-C1..C7` (UI) berstatus **BELUM DIUJI** | §5A–§5E |
| 4 | Date/time picker native | Modul native; perilaku perangkat (termasuk `display="default"` di iOS) belum pernah dilihat | §5B–§5D |
| 5 | Light/dark mode di perangkat | Belum pernah dilihat di HP; hanya diverifikasi lewat token | §5G |
| 6 | Font besar / `fontScale`, safe area, layar < 360 dp | Belum pernah diuji di perangkat | §5G |
| 7 | Performa pada data puluhan jadwal/tugas | Belum ada pengukuran di perangkat; hanya alasan desain (tanpa polling, `FlatList`) | §5L |
| 8 | iOS | Belum pernah dijalankan | — |
| 9 | Migrasi pada database aplikasi yang sudah terpasang di HP | Uji hanya pada database sintetis v1 di sandbox | §5A |
| 10 | Notifikasi lokal native: trigger `WEEKLY`, kemunculan saat aplikasi tertutup, channel, dialog izin | Kode & logika teruji (`npm test`, 90 test), tetapi **belum pernah dijalankan** | §5I |
| 11 | Notifikasi setelah perangkat dinyalakan ulang | Perilaku `AlarmManager`/jadwal setelah reboot hanya bisa dilihat di perangkat | §5K |
| 12 | Doze / keterlambatan notifikasi Android 12+ | `delivery: 'bestEffort'` (K9) — besarnya pergeseran tidak dapat diprediksi dari sandbox | §5K |
| 13 | **Kegagalan pembuatan notification channel (F2A-1)** | Fallback channel native sudah dibuktikan lewat kode paket + test, tetapi **tidak** dibuktikan di perangkat. Keputusan "tetap `synced`" bergantung pada hasil uji ini | §5M |
| 14 | **Build tanpa modul notifikasi (D6)** | Jalur `module-unavailable` teruji di Node dengan modul dipalsukan; build nyata tanpa modul belum pernah dicoba | §5M |
| 15 | Uji lapisan UI (komponen `.tsx`, hook) | Belum ada; butuh renderer React Native (dependency baru di luar batasan Fase 2). Test suite menutup lapisan data & logika saja | — |
| 16 | Skenario APK lengkap (CRUD, duplikat, picker, relasi mata kuliah, persistensi) | Pengguna melaporkan CRUD lulus di emulator Android 10; hasil itu **tidak dapat diverifikasi dari workspace ini** | §5A–§5H |

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
| K5 | `course_id` NULL dipetakan menjadi `0` | Sentinel 0 bukan id sah; berpotensi menyamarkan data yang belum ter-backfill | **Selesai** — `Schedule.courseId` bertipe `number \| null`; nilai `0` tidak lagi diproduksi dan FK menolaknya |
| K6 | Tidak ada pengecekan izin/batas jumlah data | Wajar untuk pemakaian pribadi | **Diterima** |
| K7 | Tidak ada test suite di repo (harness hanya di `/tmp`) | Regresi hanya terdeteksi manual dan hasil uji lama tidak dapat direproduksi dari repo | **Selesai (Fase 2)** — `npm test` menjalankan 191 test dari `tests/` tanpa dependency baru |
| K8 | Perilaku `@react-native-community/datetimepicker` di iOS belum pernah dijalankan (`display="default"` + tutup otomatis setelah memilih) | Bisa terasa kurang pas di iOS (platform berikutnya) | **Terbuka** — tinjau saat iOS menjadi target |
| K9 | Notifikasi memakai `delivery: 'bestEffort'` (bukan alarm exact) | Di Android 12+ Doze dapat menunda notifikasi beberapa menit; jadwal kuliah tetap tampil benar di aplikasi | **Diterima** — tidak memakai `USE_EXACT_ALARM` karena aplikasi tidak butuh ketepatan detik |
| K10 | Tidak ada notifikasi deadline tugas | Data tugas belum punya kolom menit pengingat dan PRD belum menetapkan aturan waktunya | **Terbuka** — kandidat tahap berikutnya bila PRD diperluas |
| K11 | `reminder_minutes = 0` berarti notifikasi tepat saat kelas dimulai | Bisa terasa terlambat bagi sebagian pengguna (notifikasi dan kelas mulai bersamaan) | **Diputuskan** — konsisten dengan CHECK 0–1440 dan dijelaskan di form + PRD |
| K12 | Sinkronisasi tidak atomik: notifikasi lama dibatalkan lebih dulu, lalu yang baru dijadwalkan. Bila penjadwalan gagal di tengah, perangkat sementara punya lebih sedikit notifikasi daripada jadwal | Pengingat untuk jadwal yang sedang diubah bisa hilang sampai sinkronisasi berikutnya berhasil; **tidak pernah** menghasilkan duplikat | **Diterima (Fase 1)** — urutan ini dipilih agar tidak pernah ada notifikasi ganda; status di layar Jadwal menunjukkan kegagalan + tombol coba lagi, dan percobaan berikutnya memulihkan keadaan (uji no. 11 skenario 9) |
| K13 | Kegagalan sinkronisasi di latar belakang (saat aplikasi kembali aktif) baru terlihat ketika layar Jadwal dibuka | Pengguna yang hanya membuka Hari Ini tidak melihat pemberitahuan kegagalan | **Diterima (Fase 1)** — status pengingat memang milik layar Jadwal (AC-D1); banner global di Hari Ini akan menjadi fitur baru di luar PRD |

### 7.3 Batasan lingkungan sandbox (agar tidak diulang)

- `api.expo.dev`, `expo.dev`, `u.expo.dev` tidak terjangkau → `eas build`, `npx expo install`, `expo-doctor` online gagal.
- Tidak ada JDK/Android SDK/adb/emulator → tidak mungkin build atau menjalankan aplikasi Android lokal.
- `node_modules` tidak selalu terbawa antar sesi → jalankan `npm ci` lebih dulu sebelum `npx tsc`/`npx expo lint` (tanpa itu, npm akan mencoba memasang paket bernama sama dari registry dan gagal).
- `npx expo install` butuh jaringan → untuk dependency baru, cocokkan versi dengan `node_modules/expo/bundledNativeModules.json` lalu pakai `npm install <paket>@<versi>`.

### 7.4 Temuan audit yang ditutup pada Fase 1 (2026-11-01)

| # | Temuan audit | Perbaikan | Bukti |
|---|---|---|---|
| D3 | `getAllSchedules` memakai `ORDER BY day_of_week ASC` (0 = Minggu) sehingga daftar tampil Minggu → Sabtu, sedangkan komentar menyebut Senin → Minggu | Urutan baca digeser dengan `((day_of_week + 6) % 7)`, **nilai tersimpan tidak diubah**; komentar `getAllSchedules` dan `SchedulesScreen` disesuaikan | §5 no. 10 |
| D5 | Sinkronisasi notifikasi fire-and-forget, kegagalan tidak sampai ke UI | `requestReminderSync()` (tidak pernah melempar) untuk jalur CRUD/startup/foreground; `useReminderStatus` memetakan setiap status hasil; status `active` hanya dari `synced`; pesan kegagalan + tombol coba lagi di kartu | §5 no. 11 |
| D6 | Kegagalan memuat modul native dilaporkan sebagai "platform tidak didukung" | `getNotificationModuleState()` (`unsupported` / `unavailable` / `ready`), `moduleAvailable` pada status izin, gerbang `syncGateFor` memeriksa modul sebelum izin, keadaan UI `unavailable` dengan pesan sendiri | §5 no. 12 |

### 7.5 Temuan Fase 2 & Fase 2A

| # | Temuan | Dampak | Status |
|---|---|---|---|
| F2-1 | `syncClassReminders` melaporkan **`permission-denied`** ketika status izin **gagal dibaca** (`getReminderPermissionState` → `status: 'error'`), karena `syncGateFor` hanya melihat `granted` | Menyuruh pengguna membuka Pengaturan izin untuk masalah yang bukan soal izin | **Selesai (Fase 2A)** — gerbang `syncGateFor` mengenal `status: 'error'` dan mengembalikan `'error'`; `syncClassReminders` **dan** `enableClassReminders` melaporkan `status: 'error'` dengan `PERMISSION_UNREADABLE_MESSAGE`. `permission-denied` tetap dipakai untuk izin yang benar-benar belum diberikan. Test: `tests/lib/notificationSync-permission.test.mjs` (11) |
| F2-2 | Lapisan UI (`components/*.tsx`, `hooks/*.ts`) tidak tercakup test suite | Regresi pada pemetaan status ke tampilan hanya tertangkap `tsc`/`expo lint`, bukan test | **Diterima** — membutuhkan renderer React Native (dependency baru) yang tidak sesuai batasan Fase 2 |
| F2-3 | Test suite bergantung pada versi Node yang baru (`node:test`, `node:sqlite`, type-stripping `.ts`) | Mesin dengan Node lebih lama tidak dapat menjalankan `npm test` | **Selesai (Fase 2A)** — syarat ditetapkan **Node ≥ 22.18.0** (type-stripping default), flag `--experimental-sqlite` dihapus dari seluruh script, dan `tests/support/setup.mjs` menolak versi lebih lama dengan pesan jelas. Aplikasinya sendiri tidak terpengaruh |
| F2A-1 | Channel Android `class-reminders` gagal dibuat, tetapi sinkronisasi tetap melaporkan `synced` | Pengingat **tetap tampil** karena `BaseNotificationBuilder` (expo-notifications 58.1.6) memakai channel cadangan `expo_notifications_fallback_notification_channel`. Konsekuensinya pengaturan channel kita (nama "Pengingat Kuliah", importance DEFAULT) tidak berlaku pada kejadian itu, dan perilaku ini bergantung pada detail internal paket yang tidak dijanjikan API | **Diputuskan & diuji (Fase 2A)** — bukan `error`, karena pengingat tidak hilang; syarat yang membuat keputusan itu sah diuji di `tests/lib/notificationSync-channel.test.mjs` (10). **Belum diverifikasi di perangkat** — uji wajib ada di `ANDROID_TESTING.md` §5M. Bila pengingat ternyata tidak muncul pada APK, keputusan harus diubah menjadi `error` |
| F2A-2 | Channel cadangan dipakai dengan `IMPORTANCE_HIGH`, bukan DEFAULT seperti niat desain | Pada kondisi channel gagal dibuat, notifikasi bisa tampil sebagai *heads-up* (menonjol + bunyi) padahal desain memilih DEFAULT agar tidak mengganggu | **Diterima (Fase 2A)** — hanya terjadi pada jalur kegagalan yang seharusnya langka, dan pilihannya adalah "notifikasi tampil dengan prioritas lebih tinggi" vs "pengingat tidak tampil". Bergantung pada F2A-1 dan ikut diverifikasi di `ANDROID_TESTING.md` §5M |

### 7.6 Audit kegagalan notification channel Android (Fase 2A)

Pertanyaan: bila `setNotificationChannelAsync('class-reminders', …)` gagal, apakah pengingat masih tampil?

Bukti dari kode native yang benar-benar terpasang (`node_modules/expo-notifications@58.1.6`):

| Langkah | Berkas | Isi |
|---|---|---|
| 1 | `lib/notificationScheduler.ts:116` | setiap pengingat Android dikirim dengan `channelId: 'class-reminders'` |
| 2 | `android/.../scheduling/NotificationScheduler.kt:258` | `channelId` hanya **disimpan di trigger** (`ChannelAwareTrigger`); penjadwalan tidak memvalidasi channel |
| 3 | `android/.../service/delegates/ExpoSchedulingDelegate.kt:77` | alarm berbunyi → `triggerNotification` → `NotificationsService.receive` |
| 4 | `android/.../service/NotificationsService.kt:281` | notifikasi dibangun `ExpoNotificationBuilder` (turunan `BaseNotificationBuilder`) |
| 5 | `android/.../presentation/builders/BaseNotificationBuilder.kt:39-78` | bila channel yang diminta **tidak ada**, builder memakai `FALLBACK_CHANNEL_ID` |
| 6 | `BaseNotificationBuilder.kt:126-137` | channel cadangan dibuat saat itu juga: id `expo_notifications_fallback_notification_channel`, `IMPORTANCE_HIGH` |

**Kesimpulan:** kegagalan pembuatan channel **tidak** menghilangkan pengingat — notifikasi tetap ditampilkan lewat
channel cadangan. Karena itu sinkronisasi tetap melaporkan `synced`; melaporkan `error` akan menampilkan
"coba lagi" untuk keadaan yang sebenarnya berfungsi. Syarat yang menjaga keputusan ini tetap sah (dan diuji):
channel tidak pernah membuat pengingat dibatalkan, dilewati, atau diduplikasi, dan `channelId` tetap dikirim
sehingga lapisan native dapat merutekannya.

**Risiko yang tetap ada:** prioritas channel cadangan lebih tinggi daripada niat desain (DEFAULT), dan mekanisme
ini adalah detail internal paket — bukan API yang dijanjikan. Keduanya belum bisa diverifikasi tanpa perangkat
(tercatat sebagai F2A-1). Bila hasil uji di APK menunjukkan pengingat tetap tidak muncul, ubah
`ensureClassReminderChannel()` agar kegagalan dilaporkan sebagai `error`.

### 7.7 Ketidaksesuaian dokumentasi yang ditutup pada Fase 3 (2026-11-01)

Audit isi enam dokumen terhadap kode aktual. Semua temuan di bawah sudah diperbaiki **hanya pada teks
dokumentasi**; tidak ada perubahan kode, skema, token, atau dependency.

| # | Dokumen | Ketidaksesuaian | Perbaikan |
|---|---|---|---|
| D5 | `IMPLEMENTATION_STATUS.md` | Header menulis "hash bundel identik dengan Fase 1" — tidak lagi benar sejak Fase 2A mengubah kode produksi | Kalimat hash dihapus dari header; penjelasan perubahan hash ditambahkan di §5 |
| D6 | `IMPLEMENTATION_STATUS.md` | §2 memuat tiga daftar "belum di-commit" yang saling bertumpuk (sebagian dari Tahap 5B) dan tidak memuat berkas Fase 2A | §2 ditulis ulang: tabel per kelompok + daftar hal yang **tidak** berubah |
| D7 | `IMPLEMENTATION_STATUS.md` | Peta kode §4 memakai jumlah baris lama (`classReminders` 345, `notifications` 289, `notificationSync` 193, `useReminderStatus` 169, `TodayScreen` 386) dan `tests/support/*.mjs (5)` | Semua jumlah baris disamakan dengan berkas aktual (358 / 307 / 213 / 179 / 388) dan support menjadi **6** berkas; baris `app.json` & `eas.json` ditambahkan |
| D8 | `IMPLEMENTATION_STATUS.md` | §3.4 FR-D2 masih menyebut "67 assert" dari harness `/tmp` yang sudah digantikan; FR-D5 & FR-D6 belum punya baris | Status uji diperbarui ke angka test suite permanen; FR-D5 & FR-D6 ditambahkan sebagai baris tersendiri |
| D9 | `IMPLEMENTATION_STATUS.md` | §6 punya dua baris bernomor "2", nomor `0a` di tengah, dan rujukan "§5J" untuk notifikasi (yang sebenarnya §5I); Doze, reboot, kegagalan channel, dan build tanpa modul belum tercantum | §6 ditulis ulang: 16 butir bernomor urut + kolom rujukan checklist |
| D10 | `IMPLEMENTATION_STATUS.md` | §7.5 berjudul "belum diperbaiki" padahal F2-1 & F2-3 sudah selesai; risiko F2A-2 hanya tersirat di dalam teks F2A-1 | Judul diperbaiki; F2A-2 dijadikan baris tersendiri |
| D11 | `IMPLEMENTATION_STATUS.md` | Tidak ada catatan status konfigurasi EAS maupun daftar pekerjaan menuju Release Candidate | §9 dan §10 baru |
| D12 | `README.md` | Tidak memuat daftar fitur, penjelasan arsitektur offline-first, peran SQLite sebagai sumber kebenaran, maupun kondisi notifikasi (Expo Go vs dev build) | Bagian "Fitur yang tersedia di kode" dan "Arsitektur: offline-first" ditambahkan; bagian Menjalankan & Struktur diperluas |
| D13 | `PRD.md` | §4.1 masih menandai notifikasi sebagai "(Tahap berikutnya)"; §5 menyebut menit pengingat "belum memicu notifikasi apa pun sampai tahap 6"; roadmap tahap 7 "BELUM DIMULAI" padahal fondasi regresi (test suite) sudah ada; R6 menyebut "tidak ada test suite di repo" | Status pengerjaan disamakan dengan bukti. **Tidak ada** tujuan, kebutuhan, kriteria penerimaan, atau aturan fungsional yang diubah; status tahap 5 (uji perangkat) **tetap** BELUM DIMULAI |
| D14 | `ANDROID_TESTING.md` | Belum memuat pengujian Doze/keterlambatan, nyala-ulang perangkat, performa, **kegagalan channel (F2A-1)**, dan build tanpa modul notifikasi (D6); §1 hanya menyebut satu lapisan uji Node | §5K, §5L, §5M baru; §1 diperbarui |
| D15 | `AGENTS.md` | Larangan operasi Git destruktif hanya tersirat; kewajiban memperbarui seluruh dokumen status tidak eksplisit | B2 butir 8 & 9 diperluas; B8 baru |
| D16 | `DESIGN_BRIEF.md` | `ReminderStatusCard` (Tahap 6) belum tercatat pada bagian implementasi visual, padahal brief adalah sumber kebenaran visual | Subbagian "Kartu status pengingat (Tahap 6)" ditambahkan — hanya mendokumentasikan token yang **sudah** dipakai; **tidak ada** token atau desain yang diubah |

Pemeriksaan kepatuhan token pada Fase 3 (pendukung D16):

1. **Hex, `fontSize`, `fontWeight`, `borderRadius`, angka literal `padding`/`margin`** di `components/`,
   `src/`, `hooks/` → **0 temuan**.
2. **Blok "Token TypeScript" di `DESIGN_BRIEF.md` vs `lib/tokens.ts`** — kedua berkas diimpor sebagai modul
   lalu dibandingkan per objek (`JSON.stringify`): `spacing`, `radius`, `typography`, `colors`, `geometry`,
   `elevation`, `fontFamily` → **ketujuhnya IDENTIK**. Tidak ada token yang menyimpang antara dokumen dan kode.
3. **Token tambahan di luar blok sumber** yang didokumentasikan (`breakpoint.compactWidth`, `tabularNumbers`,
   `typographyExtras`) memang ada di `lib/tokens.ts` (`breakpoint`, `tabularNumbers`, `typographyExtras`).

Karena hasilnya identik, **tidak ada** nilai token yang diubah — sesuai batasan Fase 3.

---

## 9. Status konfigurasi EAS (audit Fase 3)

### 9.1 Yang diperiksa

| Sumber | Hasil |
|---|---|
| `app.json` | Ada `name`, `slug`, `android.package`, `versionCode`, `plugins`. **Tidak ada** `extra.eas.projectId` |
| `eas.json` | Tiga profil build + `submit.production`; `cli.appVersionSource: "local"`; tanpa `owner` dan tanpa `projectId` |
| `.expo/settings.json` | **Tidak ada** folder `.expo/` di repo maupun di cache workspace |
| Berkas lain yang mungkin menyimpan project ID | Pencarian `projectId` / UUID gaya-Expo di seluruh repo (di luar `node_modules`) → hanya **teks dokumentasi**, tidak ada nilai ID |
| Riwayat Git | Seluruh commit (`1b6d5ca`, `5f8d788`, `394fd77`, `de16009`): `app.json` **tidak pernah** memuat `extra`. Satu-satunya jejak adalah catatan di pesan commit `5f8d788`: *"extra.eas.projectId sengaja belum ada; akan dibuat oleh `eas init`"* |
| Config hasil resolve (`npx expo config --type public`) | `extra` **hanya** berisi `router.asyncRoutes` (disuntikkan `expo-router`). Tidak ada `eas.projectId` di seluruh config yang benar-benar dipakai aplikasi |
| EAS CLI | Tidak terpasang di `node_modules`; `api.expo.dev` tidak terjangkau dari sandbox (TLS gagal, `curl` exit 35); tidak ada `EXPO_TOKEN`/sesi Expo |

### 9.2 Kesimpulan

**Project ID tidak dapat dipastikan dari repository maupun dari sandbox ini.** Tidak ada satu pun nilai
yang dapat dibuktikan sebagai milik proyek Kelas Hari Ini, sehingga:

- `extra.eas.projectId` **tidak ditambahkan** — mengarang UUID akan menghubungkan build ke proyek yang salah
  atau gagal total, dan itu lebih buruk daripada tidak ada ID.
- `eas init` **tidak dijalankan**, tidak ada proyek EAS baru yang dibuat.
- Klaim "proyek EAS belum pernah dibuat" **tidak** diambil: build yang pernah Anda jalankan menunjukkan
  proyeknya ada di akun Expo Anda; yang hilang hanyalah jejaknya di repository ini.

### 9.3 Informasi yang masih dibutuhkan (dari sisi Anda)

1. **Owner** akun Expo yang dipakai saat build lama (username atau nama organisasi).
2. **Slug** proyek di akun itu — diharapkan `kelas-hari-ini` (sesuai `app.json`), tetapi harus dipastikan.
3. **Project ID** (UUID) dari halaman proyek di <https://expo.dev> → *Project settings* → *Project ID*,
   atau dari URL build lama (`https://expo.dev/accounts/<owner>/projects/<slug>/builds/<id>`).

Jangan mengirim access token. Project ID **bukan** rahasia — ia memang disimpan di `app.json`.

### 9.4 Tindakan yang disarankan begitu ketiga nilai di atas ada

```bash
# Menautkan proyek yang SUDAH ADA tanpa membuat yang baru.
# Hanya dijalankan di mesin Anda sendiri (bukan sandbox, bukan CI tanpa sesi).
npx eas-cli@latest init --id <project-id-yang-terverifikasi>
```

`eas init --id …` menulis `extra.eas.projectId` ke `app.json`. Setelah itu:

- periksa `git diff app.json` — yang boleh berubah **hanya** penambahan `extra.eas.projectId`;
- jangan biarkan `eas init` mengubah `slug`, `android.package`, atau `versionCode`;
- jangan menimpa `projectId` bila nilainya sudah ada.

Bila `eas init --id` menolak karena owner/slug tidak cocok, **berhenti** dan laporkan — jangan membuat
proyek baru sebagai jalan pintas.

### 9.5 Audit profil `eas.json`

| Profil | Isi | Kegunaan | Penilaian |
|---|---|---|---|
| `development` | `developmentClient: true`, `distribution: internal`, `android.buildType: apk` | Dev build untuk menguji modul native (picker, notifikasi) + dev server | **Sesuai** |
| `preview` | `distribution: internal`, `android.buildType: apk` | **APK Release Candidate** yang bisa langsung dipasang (target awal) | **Sesuai** |
| `production` | `autoIncrement: false`, `android.buildType: app-bundle` | AAB untuk Play Store (belum dibutuhkan) | **Sesuai** untuk nanti |
| `submit.production` | `{}` | Kerangka submit; belum ada kredensial Play Store | Wajar — tidak dipakai di fase ini |

`cli.appVersionSource: "local"` berarti `version`/`versionCode` dibaca dari `app.json` (`1.0.0` / `1`), bukan
dinaikkan otomatis oleh EAS. Untuk RC ini benar: nomor versi tetap dan dapat dilacak. Sebelum build berikutnya
setelah RC pertama, naikkan `versionCode` secara manual.

**Tidak ada perubahan pada `eas.json` atau `app.json` pada Fase 3.** Tidak ada build yang dijalankan.

---

## 10. Pekerjaan menuju Release Candidate (APK internal)

Target terdekat: **APK `preview` yang dapat dipasang di perangkat Anda**, bukan publikasi Play Store.
Urutan yang disarankan — jangan melompati butir 1–2 karena semuanya bergantung pada build nyata.

| # | Pekerjaan | Bergantung pada | Status |
|---|---|---|---|
| 1 | Verifikasi `projectId` lama, tautkan dengan `eas init --id …` (§9.4) | info owner/slug/ID dari Anda | **Menunggu** |
| 2 | Build pertama `--profile preview` dan pasang APK di Android 10 | #1 | **Belum** |
| 3 | Jalankan checklist `ANDROID_TESTING.md` §5A–§5H (CRUD, persistensi, relasi, tampilan, aksesibilitas) | #2 | **Belum** |
| 4 | Jalankan §5I (izin, channel, notifikasi saat aplikasi tertutup, edit/hapus, tanpa duplikat) | #2 | **Belum** |
| 5 | Jalankan §5K (nyala ulang perangkat, Doze/keterlambatan) — menutup K9 | #4 | **Belum** |
| 6 | Jalankan §5L (performa, jumlah data nyata) | #2 | **Belum** |
| 7 | Jalankan §5M (kegagalan channel F2A-1 + build tanpa modul D6) — menentukan apakah keputusan channel harus diubah | #4 | **Belum** |
| 8 | Perbaiki temuan dari #3–#7, lalu perbarui `IMPLEMENTATION_STATUS.md` §3, §5, §6 | #3–#7 | **Belum** |
| 9 | Putuskan nasib risiko terbuka: K1/FR-B7 (ganti nama mata kuliah), K8 (picker iOS), K10 (notifikasi deadline), F2-2 (uji UI) | — | **Terbuka** |
| 10 | Uji migrasi pada **salinan** database dari perangkat yang sudah memakai versi lama (menutup §6 no. 9) | #3 | **Belum** |
| 11 | Tinjau ikon/splash final dan nomor versi sebelum RC berikutnya | — | **Belum** |
| 12 | Commit + push seluruh perubahan (Fase 1–3) — **hanya setelah Anda setujui** | persetujuan Anda | **Ditahan** |

Yang **bukan** bagian dari RC ini: publikasi Play Store, `eas submit` ke produksi, build iOS, layar kelola
mata kuliah (FR-B7), dan notifikasi deadline tugas (K10).

---

## 11. Cara memperbarui dokumen ini

1. Perbarui setelah **setiap** tahap yang selesai (atau saat status berubah), bukan hanya saat diminta.
2. Ubah bagian yang benar-benar terdampak: §3 (status fitur), §5 (pengujian baru), §6 (yang masih belum diuji), §7 (masalah).
3. Tulis hasil perintah **apa adanya**, termasuk kegagalan. Jangan menaikkan status menjadi `SELESAI` tanpa bukti.
4. Jalankan `npm test` dan tempel jumlah lulus/gagal yang sebenarnya. Bila ada test yang diubah ekspektasinya, jelaskan alasannya — jangan melemahkan test agar lulus.
5. Bedakan dengan tegas: uji statis (tsc/lint/bundle), uji lapisan data (SQLite), uji logika (Node), dan uji runtime perangkat. Label konteksnya.
6. Jangan menuliskan token, kredensial, atau ID akun. Project ID EAS **bukan** kredensial dan boleh dicatat bila sudah terverifikasi (§9).
7. Bila sebuah risiko tertutup, ubah statusnya di §7 **dan** hapus rujukannya dari §6 hanya setelah bukti perangkatnya ada — jangan menghapus catatannya.
8. Perbarui §9 setiap kali konfigurasi EAS berubah, dan §10 setiap kali satu butir menuju RC selesai.
