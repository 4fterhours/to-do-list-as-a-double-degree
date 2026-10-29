# Hari Ini — Design Brief

> **Fondasi yang jelas. Siap diimplementasikan.**
> Satu layar. Dua mode. Satu sistem visual yang konsisten.

Dokumen ini adalah salinan kerja Design Brief sumber untuk proyek ini. Blok **Token TypeScript** di bawah adalah acuan utama nilai visual, dan implementasinya berada di [`lib/tokens.ts`](./lib/tokens.ts). Bila dokumen ini dan kode berbeda, blok token sumber yang menang.

- **Stack:** React Native + Expo (SDK 58) + TypeScript + Expo Router.
- **Cakupan brief ini:** layar **Hari Ini** sebagai mockup — satu route (`/`), tanpa tab navigator,
  tanpa kontrol CRUD. Larangan CRUD/navigasi di §03, §12, dan §13 mengacu pada cakupan mockup itu;
  layar pengelolaan Jadwal & Tugas adalah perluasan produk yang ditetapkan di `PRD.md` §6.2–6.3
  (lihat catatan cakupan di §12 dan bagian "Layar pengelolaan (Tahap 5)").
- **Target platform:** Android (prioritas), iOS (kompatibel), web (sekunder).

---

## BAGIAN A: Rancangan visual

Pratinjau menampilkan light dan dark pada frame 393 × 852 dp. Kontrol review di luar frame mengubah kondisi kedua mockup. Pada layar kecil gunakan ikon tema untuk meninjau kedua mode. Kontrol review bukan bagian dari layar aplikasi.

---

## BAGIAN B: Design brief tertulis

### 01 / Arah desain

Tenang, personal, dan sedikit editorial. Latar netral hangat, tipografi sistem, dan satu aksen eukaliptus. Area hijau menandai kelas; amber hanya untuk deadline dekat dan merah hanya untuk terlambat. Tidak ada identitas merek baru. Titik pada judul mengikuti warna aksen, bukan logo.

### 02 / Tujuan & hierarki

Dalam beberapa detik pengguna mengetahui kelas berikutnya, kapan dimulai, lokasi, jumlah kelas tersisa, dan tugas belum selesai dengan deadline paling dekat. Urutan perhatian: kartu kelas → ringkasan sisa kelas → daftar tugas. Tugas diurutkan deadline ascending; tugas terlambat tetap di atas.

### 03 / Struktur layout

Frame 393 × 852 dp. Status bar 44 dp pada mockup; implementasi memakai safe-area perangkat, bukan nilai tetap. Padding horizontal 24 dp. Header: judul 32/40 dan tanggal 16/24, jarak 4. Jarak header–kartu 24. Kartu minimum 252 dp, padding 24. Ringkasan kelas padding vertikal 24. Divider 1 dp lalu judul tugas dengan padding atas 24. Baris tugas padding vertikal 16, tanpa kartu bertumpuk. Area konten boleh digulir; tidak ada navigasi aplikasi atau kontrol CRUD **pada layar mockup ini**
(pengelolaan ada di layar terpisah — lihat §12).

### 04 / Typography

Font: Android sans-serif (Roboto sistem), iOS System (San Francisco), web -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif. `typography.title` = 32/40/700; `course` = 28/36/600; `section` = 20/28/600; `time` = 20/28/600; `taskTitle` = 18/26/600; `body` = 16/24/400; `bodyStrong` = 16/24/600; `caption` = 13/20/400; `label` = 12/16/600 dengan letterSpacing 1.2. Format ukuran/lineHeight/weight. Angka waktu tabular-nums; label hanya untuk overline, bukan informasi utama.

### 05 / Spacing, radius & elevation

`spacing.none` 0, `xxs` 4, `xs` 8, `sm` 12, `md` 16, `lg` 24, `xl` 32, `xxl` 40, `xxxl` 48. `radius.label` 6; `small` 8; `card` 20; `frame` 32 (hanya mockup); `pill` 999. `border.width` dan `divider.width` 1 dp. `elevation.card` 0 dan `elevation.row` 0, tanpa shadow. `geometry.icon` 20, `iconSmall` 16, `statusDot` 6, `touchTarget` 48, `statusBarHeight` 44, `statusSignal` 14, `statusWifi` 15, `statusBattery` 19, `summaryIconContainer` 40, `gestureWidth` 108, `gestureHeight` 4. Semua dp. Ringkasan icon container bukan tombol. Status bar dan gesture hanya simulasi perangkat. Divider penuh selebar konten. Tidak ada border atau elevasi di baris tugas.

### 06 / Mapping warna

Seluruh pasangan di bawah berurutan **LIGHT / DARK**. `color.background` `#FAFAF7` / `#171D1A`; `surface` `#FFFFFF` / `#202823`; `surfaceSubtle` `#F1F2ED` / `#252E28`; `text.primary` `#242C29` / `#EDF1E9`; `text.secondary` `#657069` / `#B0BBAF`; `text.muted` `#697267` / `#A1AFA2`; `border` `#DEE3DB` / `#354138`; `accent` `#35634F` / `#A7C6AB`. Gunakan `text.primary` untuk judul dan `text.secondary` untuk metadata, bukan opacity teks.

### 07 / Warna semantik

`color.class.background` `#E9F0E8` / `#293D30`; `class.text` `#294D3D` / `#D8E8D4`; `class.border` `#CEDDCE` / `#405743`. `color.info.background` `#EDF1F5` / `#28343F`; `info.text` `#465F76` / `#B8CCDE`. `color.deadline.background` `#FFF1DD` / `#3D3020`; `deadline.text` `#8C5319` / `#EDC18A`. `color.overdue.background` `#FBEAE6` / `#412A26`; `overdue.text` `#AA3D31` / `#F2ADA1`. `color.complete.background` sama dengan `class.background`; `complete.text` sama dengan `accent`. `color.pending.background` sama dengan `surfaceSubtle`; `pending.text` sama dengan `text.secondary`. Status selesai/belum selesai tidak ditampilkan sebagai checkbox karena bukan scope CRUD.

### 08 / Aturan komponen

Kartu kelas: background `class.background`, border `class.border` 1, radius `card`, padding `lg`. Overline `label`, judul `course`, jam `time`, lokasi `caption` + `iconSmall`. Countdown di footer dengan divider `class.border` dan padding atas `md`; angka `bodyStrong`. Sisa kelas: icon layers dalam `surfaceSubtle`, `bodyStrong` dan `caption`, tanpa border luar. Tugas: course `caption`, judul `taskTitle`, tanggal `caption` dengan `calendar-outline`. Badge: radius `label`, horizontal `xs`, vertikal `xxs`, `caption` weight 600; gunakan pasangan foreground/background semantik. Teks pendukung `caption` dan `text.secondary`; footer `text.muted`. Ikon harus membantu identifikasi waktu, lokasi, jumlah, atau deadline, bukan hiasan.

### 09 / Responsif & aksesibilitas

Pada 393 dp padding 24; di bawah 360 dp padding 16. Lebar konten mengikuti layar; tidak menggunakan koordinat absolut. Teks mengikuti fontScale; judul dan nama panjang wrap tanpa ellipsis. Footer countdown boleh wrap menjadi dua baris. Target sentuh minimal 48 × 48 hanya jika ada aksi; kartu di desain ini informatif, bukan tombol. Jangan mengandalkan warna: semua status memiliki label. Target kontras WCAG AA 4.5:1 teks biasa dan 3:1 teks besar; periksa ulang dengan alat kontras sebelum rilis. Kelompokkan kartu untuk screen reader dan bacakan waktu sebagai jam, bukan deretan simbol.

### 10 / State tambahan

Tidak ada kelas: ganti isi kartu menjadi “Kelas hari ini selesai.” dan keterangan singkat, hilangkan waktu, ruang, dan countdown; ringkasan menjadi “Tidak ada kelas tersisa”. Kelas berlangsung: label “Sedang berlangsung”, footer “Selesai 11.40”; tanpa hitung mundur negatif. Tidak ada tugas: “Semua tugas sudah beres.” dan “Belum ada tugas yang perlu diselesaikan.” Terlambat: overdue, label “Terlambat 9 jam”, tanggal “Kemarin, 23.59”; tidak memakai warna amber. Judul panjang: tinggi otomatis dan scrolling; metadata tidak ditimpa. Loading data nyata: skeleton pada area isi tanpa mengubah header; kegagalan: pesan inline “Jadwal belum dapat dimuat” dan aksi “Coba lagi” hanya jika integrasi data tersedia.

### 11 / Logika waktu & data contoh

Mockup membekukan Senin, 26 Oktober 2026 pukul 09.20 untuk konsistensi. Hukum Dagang 10.00–11.40, ruang contoh B-204, countdown 40 menit. Total tiga kelas tersisa termasuk berikutnya, kelas terakhir berakhir 16.40. Analisis Putusan Pengadilan: 26 Oktober 23.59 (~14 jam lagi); Laporan Praktikum Basis Data: 28 Oktober 23.59 (~2 hari lagi), terkait proyek Pemrograman Web. Semua data ilustratif, bukan data kampus terverifikasi. State berlangsung menggunakan 10.20. Implementasi memakai zona waktu lokal pengguna, bukan zona waktu kampus yang diasumsikan. Deadline ≤24 jam amber; >24 jam info; lewat deadline merah. Countdown dibulatkan ke atas per menit. Angka sisa kelas mencakup kelas berlangsung dan kelas yang belum mulai.

### 12 / Daftar DILARANG

Tanpa gradient dekoratif, glassmorphism, transparansi berlebihan, neon, bayangan tebal, kartu seragam bertumpuk, banyak aksen, ikon dekoratif, emoji UI, grafik/statistik tidak perlu, ilustrasi stok, atau foto tak relevan. Tanpa bottom navigation, tambah, form, CRUD, atau tombol tanpa fungsi. Jangan mengecilkan teks demi menjejalkan konten. Tidak ada efek yang sulit diterapkan atau nilai visual yang tidak masuk token. Kontrol pada halaman review berada di luar mockup dan bukan bagian layar aplikasi.

> **Catatan cakupan (Tahap 5B).** Daftar larangan di atas — termasuk "tanpa bottom navigation,
> tambah, form, CRUD, atau tombol tanpa fungsi" — mengikat **tampilan layar Hari Ini** sebagaimana
> digambarkan mockup: satu kartu kelas, satu ringkasan sisa kelas, satu daftar tugas, tanpa tab.
> Sejak Tahap 5, produk menambahkan **layar pengelolaan Jadwal dan Tugas** sesuai `PRD.md` §6.2–6.3.
> Perluasan itu:
>
> - **tidak** mengubah hierarki, tipografi, spacing, warna, atau token apa pun di dokumen ini;
> - tetap **tanpa tab navigator** — pengelolaan dibuka lewat dua tombol teks di bawah tanggal dan
>   ditutup dengan tombol kembali;
> - memakai komponen yang sama (`surface`, `border`, `accent`, `radius.small`, `touchTarget`) dan
>   dilarang memakai gradient, bayangan, glassmorphism, warna aksen tambahan, ikon dekoratif, atau
>   nilai visual yang tidak ada di token;
> - tetap mematuhi §09 (target sentuh 48 dp hanya pada aksi, kontras, teks wrap tanpa ellipsis) dan
>   §10 (state kosong/loading/error yang sama).

Semua spesifikasi visual lain di dokumen ini tetap berlaku apa adanya.

### 13 / Panduan React Native + Expo

Pisahkan `tokens.ts`, `TodayScreen`, `NextClassCard`, `RemainingClasses`, `TaskRow` dan `StatusLabel` saat produksi. Gunakan TypeScript, `SafeAreaView`, `View`, `Text`, `FlatList` dan Ionicons. Tidak perlu font kustom, aset gambar, blur, atau gradient. Pilih tema melalui `useColorScheme`; referensikan tokens berdasarkan nama semantik, bukan hex di komponen. Gunakan Expo Router `app/index.tsx` untuk menampilkan `TodayScreen`; pada mockup Hari Ini cukup satu route tanpa tab navigator (route pengelolaan ditambahkan kemudian — lihat catatan cakupan §12). Status bar native mengikuti tema, status bar simulasi hanya untuk mockup web. `FlatList` menyimpan header kelas dan data tugas; empty state melalui `ListEmptyComponent`. Hitung ulang data saat app aktif atau pergantian hari. Tidak ada dependensi backend untuk fondasi ini.

---

## Token TypeScript

Blok di bawah adalah **acuan utama**. `lib/tokens.ts` mengikuti isi ini apa adanya (nama ekspor, bentuk objek, dan nilai).

```typescript
import { Platform } from 'react-native';

export const spacing = { none: 0, xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 40, xxxl: 48 } as const;
export const radius = { small: 8, label: 6, card: 20, frame: 32, pill: 999 } as const;
export const typography = {
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  course: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  section: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  time: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  taskTitle: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 1.2 },
} as const;
export const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' });
export const colors = {
  light: {
    background: '#FAFAF7', surface: '#FFFFFF', surfaceSubtle: '#F1F2ED',
    text: { primary: '#242C29', secondary: '#657069', muted: '#697267' },
    border: '#DEE3DB', accent: '#35634F',
    class: { background: '#E9F0E8', text: '#294D3D', border: '#CEDDCE' },
    info: { background: '#EDF1F5', text: '#465F76' },
    deadline: { background: '#FFF1DD', text: '#8C5319' },
    overdue: { background: '#FBEAE6', text: '#AA3D31' },
    complete: { background: '#E9F0E8', text: '#35634F' },
    pending: { background: '#F1F2ED', text: '#657069' },
  },
  dark: {
    background: '#171D1A', surface: '#202823', surfaceSubtle: '#252E28',
    text: { primary: '#EDF1E9', secondary: '#B0BBAF', muted: '#A1AFA2' },
    border: '#354138', accent: '#A7C6AB',
    class: { background: '#293D30', text: '#D8E8D4', border: '#405743' },
    info: { background: '#28343F', text: '#B8CCDE' },
    deadline: { background: '#3D3020', text: '#EDC18A' },
    overdue: { background: '#412A26', text: '#F2ADA1' },
    complete: { background: '#293D30', text: '#A7C6AB' },
    pending: { background: '#252E28', text: '#B0BBAF' },
  },
} as const;
export type ThemeColors = typeof colors.light | typeof colors.dark;
export const geometry = { frameWidth: 393, frameHeight: 852, borderWidth: 1, dividerWidth: 1, touchTarget: 48, icon: 20, iconSmall: 16, statusDot: 6, taskMarker: 20, heroMinimumHeight: 252, statusBarHeight: 44, statusSignal: 14, statusWifi: 15, statusBattery: 19, summaryIconContainer: 40, gestureWidth: 108, gestureHeight: 4 } as const;
export const elevation = { card: 0, row: 0 } as const;
```

---

## Catatan implementasi (keputusan proyek)

Bagian ini **bukan** bagian dari brief desain. Isinya mencatat bagaimana brief diterjemahkan ke repository ini.

### Struktur file

```
src/app/_layout.tsx   Root layout Expo Router: SafeAreaProvider, StatusBar, Stack tanpa header
src/app/index.tsx      Route "/" — TodayScreen (layar utama)
src/app/jadwal/        Route "/jadwal" (daftar), "/jadwal/baru", "/jadwal/[id]" (ubah + hapus)
src/app/tugas/         Route "/tugas" (daftar), "/tugas/baru", "/tugas/[id]" (ubah + hapus)
components/           Kartu & baris Hari Ini, plus layar/komponen pengelolaan (Tahap 5)
lib/tokens.ts         SATU-SATUNYA sumber nilai visual (mengikuti blok token di atas)
theme/useTheme.ts     Logika pemilihan tema; tidak menyimpan nilai visual
db/                    Skema, migrasi, seed, akses data (tanpa SQL di komponen)
hooks/                useTodayData (data + waktu Hari Ini), useFocusQuery (query sadar fokus)
```

`components/` dan `db/` baru dibuat bersama file pertamanya, karena Git tidak melacak folder kosong dan `.gitkeep` membuat `expo lint` gagal ("all files ignored"). App berada di `src/app/` sesuai lokasi bawaan template Expo SDK 58.

### Pemetaan nilai brief → token

Nilai yang disebut dalam teks brief tetapi tidak muncul sebagai kunci di blok token dipetakan ke token terdekat, tidak diduplikasi:

| Kebutuhan brief | Token yang dipakai |
|---|---|
| Padding horizontal 24 dp (§03/§09) | `spacing.lg` |
| Padding horizontal 16 dp di bawah 360 dp (§09) | `spacing.md` |
| Jarak header–kartu 24 (§03) | `spacing.lg` |
| Jarak judul–tanggal 4 (§03) | `spacing.xxs` |
| Tinggi minimum kartu 252 (§03) | `geometry.heroMinimumHeight` |
| Padding vertikal ringkasan 24 (§03) | `spacing.lg` |
| Padding vertikal baris tugas 16 (§03) | `spacing.md` |
| Divider 1 dp (§03/§05) | `geometry.dividerWidth` |
| Border 1 dp kartu (§05) | `geometry.borderWidth` |
| Frame 393 × 852 (§03, mockup) | `geometry.frameWidth` / `geometry.frameHeight` |

`fontFamily` adalah token terpisah, bukan properti di dalam `typography`. Komponen menyusunnya eksplisit:

```tsx
style={[styles.title, { color: colors.text.primary }]}
// styles.title = { ...typography.title, fontFamily }
```

### Token tambahan di luar blok sumber

Hanya tiga, semuanya berasal dari teks brief dan dibutuhkan kode:

| Token | Nilai | Alasan |
|---|---|---|
| `breakpoint.compactWidth` | 360 | §09: "di bawah 360 dp padding 16". Tidak ada di blok token, jadi didefinisikan sekali sebagai token. |
| `tabularNumbers` | `{ fontVariant: ['tabular-nums'] }` | §04: "Angka waktu tabular-nums". Sengaja dipisah agar objek `typography` tetap identik dengan sumber. |
| `typographyExtras.captionStrong` | `fontSize`/`lineHeight` dari `typography.caption` (13/20), `fontWeight: '600'` | §08: badge memakai "caption weight 600", sedangkan `typography.caption` di blok sumber berbobot 400. Ukuran dan line height **diwarisi** dari `typography.caption` (bukan ditulis ulang), jadi hanya weight yang ditambahkan dan tidak ada angka duplikat. |

Tidak ada token lain di luar blok sumber. Tidak ada hex, ukuran font, radius, atau jarak literal di komponen. Objek `typography` sengaja **tidak** diubah agar tetap identik dengan blok token di atas.

### Token khusus mockup (jangan dipakai UI aplikasi)

`geometry.frameWidth`, `geometry.frameHeight`, `geometry.statusBarHeight`, `geometry.statusSignal`, `geometry.statusWifi`, `geometry.statusBattery`, `geometry.gestureWidth`, `geometry.gestureHeight`, dan `radius.frame`. Aplikasi memakai `SafeAreaView`, bukan tinggi 44 dp tetap.

### Layar Hari Ini (Tahap 3)

- **Judul layar** "Hari Ini" + titik aksen; tanggal panjang `Senin, 26 Oktober 2026`. Nama aplikasi di `app.json` masih "Kelas Hari Ini" (dari Tahap 1) — belum diubah karena di luar lingkup tahap ini.
- **Komponen:** `TodayScreen` (satu `FlatList`), `NextClassCard`, `RemainingClasses`, `TaskRow`, `StatusLabel`, ditambah `hooks/useTodayData.ts` (data + waktu) dan `lib/time.ts` (fungsi waktu murni).
- **Label badge deadline** (tidak pernah hanya warna): `Terlambat N jam` / `Sisa N menit` / `Sisa N jam` / `Sisa N hari` / `Baru saja lewat`. Pembulatan ke BAWAH untuk jam & hari, konsisten dengan contoh brief "Terlambat 9 jam" (9,35 jam). Countdown kelas dibulatkan ke ATAS per menit sesuai brief 11.
- **Tanggal deadline:** `Hari ini, 23.59`, `Kemarin, 23.59`, `Besok, 23.59`, selain itu `28 Oktober, 23.59` (+ tahun bila beda tahun). Nama hari/bulan ditulis eksplisit di `lib/time.ts`, tidak memakai `Intl`, agar hasil sama di Hermes.
- **Data:** nama mata kuliah pada baris tugas diambil dari `tasks.course_id` → `courses.name` (skema v2), dengan cadangan `schedules.course_name` untuk baris lama. Tugas tanpa relasi memakai fallback "Tugas mandiri".
- **Waktu:** jam lokal perangkat; `now` diperbarui tiap 30 detik; data dibaca ulang saat app kembali aktif dan saat tanggal lokal berganti. Tidak ada waktu beku mockup.
- **Kartu kosong tanpa tinggi minimum.** `geometry.heroMinimumHeight` (252 dp) hanya diterapkan bila kartu benar-benar memuat kelas — di sana tinggi minimum berguna agar footer countdown duduk di dasar kartu (brief 03). Pada state "Kelas hari ini selesai." (brief 10) kartu hanya berisi judul + satu keterangan, sehingga tinggi mengikuti isi; memaksakan 252 dp menyisakan ruang kosong besar tanpa informasi. Radius, border, dan padding tetap dari token yang sama.

### Layar pengelolaan (Tahap 5)

Layar Hari Ini tetap layar utama dan satu-satunya yang dibuka saat app dibuka. Tidak ada tab navigator (brief 12); pengelolaan dijangkau lewat **dua tombol teks di bawah tanggal** — "Jadwal" dan "Tugas" — memakai `Stack` biasa dengan tombol kembali.

| Elemen | Komponen | Token yang dipakai |
|---|---|---|
| Tombol masuk pengelolaan | `TodayScreen` → `ManageLinks` | `geometry.touchTarget` (48 dp), `radius.small`, `spacing.md`/`xxs`, `colors.surface`/`surfaceSubtle`/`border`/`accent`, `geometry.iconSmall` |
| Judul + tombol kembali | `ScreenHeader` | `typography.title`, `spacing.lg`, `touchTarget` |
| Label & pesan galat field | `FormField` | `typography.caption`, `typographyExtras.captionStrong` (label), `colors.overdue.text` (galat) |
| Isian teks | `TextField` | `typography.body`, `radius.small`, `colors.surface`/`border`/`text.muted` |
| Pilihan hari & mata kuliah | `ChipRow` | `geometry.touchTarget`, `radius.small`, `colors.accent` (aktif) |
| Tanggal & jam | `DateTimeField` (`@react-native-community/datetimepicker`) | sama seperti `TextField`; di web memakai isian teks `DD/MM/YYYY` dan `HH:mm` karena picker native tidak tersedia |
| Tombol aksi | `ButtonRow`, `PrimaryButton`, `DangerButton` | `geometry.touchTarget`, `radius.small`, `colors.accent`/`overdue.background` |
| Konfirmasi hapus | `ConfirmDialog` | `colors.surface`, `radius.large`, `spacing.lg`, `accent`/`overdue.text` |

Aturan yang dijaga:

- **Riwayat tidak terhapus tanpa konfirmasi.** Hapus jadwal dan hapus tugas selalu melewati `ConfirmDialog` dengan nama data yang akan dihapus.
- **Status selesai bukan sekadar warna.** Baris tugas selesai memakai ikon centang + teks coret, bukan hanya perubahan warna (brief 07/08).
- **Mata kuliah itu identitas, bukan satu sesi.** Pemilih mata kuliah di form tugas membaca tabel `courses`; satu mata kuliah dengan dua sesi mingguan tetap muncul satu kali.
- **Tanggal & jam selalu waktu lokal perangkat**, disimpan sebagai epoch milidetik (`deadline_at`) dan sebagai teks `HH:mm` untuk jadwal mingguan.
- **Pesan galat di dua tingkat**: per field (validasi) dan di atas tombol simpan (kegagalan SQLite), tanpa menghilangkan isian pengguna.

### Deviasi sadar terhadap brief

1. **Waktu mockup vs waktu runtime.** Brief membekukan Senin 26 Oktober 2026 09.20 untuk konsistensi mockup, tetapi implementasi wajib memakai zona waktu lokal pengguna dan menghitung ulang saat app aktif atau pergantian hari. Keduanya disengaja: data contoh tetap ilustratif, perilaku runtime mengikuti jam perangkat.
2. **Status bar.** `geometry.statusBarHeight` (44) hanya nilai mockup; aplikasi memakai safe-area perangkat (§03/§09).
3. **`fontFamily` bertipe `string`.** `Platform.select` bertipe `string | undefined`. Nilai `default` (stack web) dipakai sebagai fallback, sehingga tipenya ditegaskan `string` dan tidak ada `fontFamily: undefined` yang tidak sengaja.
4. **Hex di `app.json`.** `expo-splash-screen.backgroundColor` (`#FAFAF7`) dan `android.adaptiveIcon.backgroundColor` adalah konfigurasi JSON statis yang tidak dapat mengimpor `lib/tokens.ts`. Nilai splash disamakan dengan `color.background`; bila token berubah, ubah juga di sini.
5. **Sumber data.** Layar membaca & menulis SQLite lewat `db/schedules.ts`, `db/tasks.ts`, dan `db/courses.ts` (tanpa SQL di komponen). Sejak Tahap 5 operasi tulis (tambah/ubah/hapus/tandai selesai) memang bagian dari aplikasi; migrasi & seed tetap satu-satunya jalur yang mengisi data contoh. Catatan platform: SQLite di web memakai `SharedArrayBuffer`/`Atomics`, sehingga butuh konteks cross-origin isolated (COOP/COEP). Server dev Metro tidak mengirim header itu, jadi di browser inisialisasi database kemungkinan gagal dan layar menampilkan pesan error; Android/iOS tidak terpengaruh.
6. **Kontras.** Pasangan warna diukur terhadap WCAG AA memakai rumus luminans relatif (dihitung sekali dari nilai di `lib/tokens.ts`; belum ada skrip otomatis di repo). Semua pasangan teks **lulus 4.5:1**, light maupun dark.

   | Pasangan | Light | Dark |
   |---|---|---|
   | `text.primary` di `background` | 13.69 | 14.96 |
   | `text.secondary` di `background` | 4.93 | 8.62 |
   | `text.muted` di `background` | 4.78 | 7.47 |
   | `text.secondary` di `surface` | 5.15 | 7.61 |
   | `text.muted` di `surface` | 5.00 | 6.60 |
   | `class.text` di `class.background` | 8.14 | 9.10 |
   | `accent` di `class.background` | 5.93 | 6.27 |
   | `info.text` di `info.background` | 5.86 | 7.70 |
   | `deadline.text` di `deadline.background` | 5.61 | 7.67 |
   | `overdue.text` di `overdue.background` | 5.27 | 7.11 |
   | `pending.text` di `pending.background` | 4.58 | 7.05 |
   | `accent` di `background` (grafis, ambang 3:1) | 6.59 | 9.22 |

   Catatan: `class.border` di `class.background` hanya 1.22 (light) / 1.48 (dark). Border ini dekoratif — makna kartu dibawa oleh teks, bukan garis — sehingga tidak terkena kriteria non-text contrast 1.4.11. Jangan mengandalkan border sebagai satu-satunya penanda status.
