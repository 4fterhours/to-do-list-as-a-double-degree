# PRD — Kelas Hari Ini

**Produk:** aplikasi mobile pribadi untuk mahasiswa: jadwal kuliah mingguan + tugas akademik dalam satu layar.
**Platform utama:** Android (target pengujian Android 10 / API 29) · **berikutnya:** iOS.
**Stack:** React Native + Expo (SDK 58) + TypeScript + Expo Router.
**Penyimpanan:** SQLite lokal di perangkat. Tanpa akun, backend, API server, atau sinkronisasi.

| Dokumen | Peran |
|---|---|
| `PRD.md` (dokumen ini) | **Apa** yang dibangun dan bagaimana diuji (kebutuhan produk + kriteria penerimaan) |
| `DESIGN_BRIEF.md` | **Bagaimana tampilannya** — sumber kebenaran visual, termasuk blok token |
| `IMPLEMENTATION_STATUS.md` | **Apa yang sudah ada di kode** dan apa yang sudah/belum diuji |
| `AGENTS.md` | Aturan kerja untuk agen/robot coding |
| `ANDROID_TESTING.md` | Prosedur build & checklist uji di HP Android |

Bila dokumen saling bertentangan: untuk perilaku produk pakai `PRD.md`, untuk nilai visual pakai blok token di `DESIGN_BRIEF.md` dan `lib/tokens.ts`, untuk status implementasi pakai `IMPLEMENTATION_STATUS.md`. Konflik yang tidak bisa diputuskan sendiri harus dilaporkan, bukan diputuskan diam-diam.

---

## 1. Ringkasan produk

Satu aplikasi untuk menjawab empat pertanyaan mahasiswa setiap hari:

1. Kelas apa berikutnya, jam berapa, di ruang mana?
2. Masih ada berapa kelas lagi hari ini?
3. Tugas apa yang paling mendesak?
4. Bagaimana mengubah jadwal dan tugas itu?

Layar utama **Hari Ini** menjawab 1–3 dengan sekali lihat. Layar pengelolaan **Jadwal** dan **Tugas** menjawab 4.

## 2. Masalah & tujuan

Jadwal kuliah biasanya tersebar di PDF/WhatsApp dan deadline tugas di kepala atau catatan terpisah. Akibatnya kelas terlewat dan deadline terlupa.

**Tujuan produk**

- Satu tempat, satu layar utama, tanpa perlu koneksi internet.
- Informasi yang paling mendesak selalu di atas: kelas berikutnya lebih dulu, lalu tugas dengan deadline terdekat.
- Pengguna dapat memperbaiki datanya sendiri (tambah/ubah/hapus) tanpa menyentuh kode.

**Bukan tujuan**

- Bukan aplikasi kolaborasi, bukan pengingat kelas daring, bukan pengelola nilai/IPK, bukan kalender lengkap.

## 3. Pengguna & platform

| Aspek | Keputusan |
|---|---|
| Pengguna | Satu orang (pemilik perangkat). Tidak ada akun, login, atau profil. |
| Data | 100% lokal di SQLite perangkat. Tidak ada pengiriman data ke mana pun. |
| Android | Platform utama. Target pengujian: **Android 10 (API 29)**; aplikasi mendukung minSdk 24. |
| iOS | Kompatibel secara kode, belum menjadi target pengujian. |
| Web | Bukan target produk. Hanya alat bantu saat pengembangan; keterbatasan SQLite di web (butuh COOP/COEP) membuat data mungkin gagal dimuat di browser. |
| Orientasi | Potret. |
| Tema | Mengikuti tema sistem (light/dark). |

## 4. Ruang lingkup & batasan produk

### 4.1 Termasuk ruang lingkup

- Layar Hari Ini (kelas berikutnya/berlangsung, sisa kelas, daftar tugas belum selesai).
- Pengelolaan jadwal mingguan: lihat, tambah, ubah, hapus.
- Pengelolaan tugas: lihat, tambah, ubah, hapus, tandai selesai, buka kembali.
- Identitas mata kuliah yang konsisten (satu mata kuliah boleh punya beberapa sesi jadwal dan beberapa tugas).
- Penyimpanan lokal persisten + migrasi skema berversi.
- (Tahap berikutnya) Notifikasi lokal terjadwal.

### 4.2 Tidak boleh ditambahkan tanpa persetujuan eksplisit

| Dilarang tanpa persetujuan | Alasan |
|---|---|
| Backend, API server milik aplikasi, autentikasi/akun | Produk single-user lokal; menambah server mengubah arsitektur & privasi |
| Sinkronisasi cloud / multi-perangkat | Sama seperti di atas; butuh akun & konflik resolusi |
| Push notification dari server | Hanya notifikasi **lokal** yang direncanakan |
| Integrasi kalender eksternal (Google/Apple Calendar) | Di luar ruang lingkup; butuh izin & pemetaan data |
| Fitur yang tidak tercantum di dokumen ini (nilai/IPK, presensi, catatan kuliah, dsb.) | Menjaga fokus & ukuran aplikasi |
| Dependency baru tanpa alasan teknis yang dijelaskan | Setiap dependency native memperberat build & uji perangkat |
| Perubahan yang menghapus atau mereset data pengguna (drop table, hapus DB, seed ulang paksa) | Data pengguna tidak boleh hilang; migrasi wajib aditif |
| Mengubah `targetSdk`/konfigurasi native untuk memaksa build berhasil | Menyembunyikan masalah kompatibilitas |

### 4.3 Konflik arah produk yang sudah diputuskan

Design brief sumber menulis "satu route, tanpa CRUD". **Keputusan produk saat ini:** layar Hari Ini tetap satu-satunya layar utama tanpa tab navigator, tetapi pengelolaan jadwal & tugas **diizinkan** dan dijangkau dari Hari Ini melalui dua tombol. Lihat `DESIGN_BRIEF.md` §12 "Catatan cakupan" (ditambahkan Tahap 5B) yang menjelaskan bahwa larangan tersebut mengikat mockup Hari Ini, sedangkan layar pengelolaan adalah perluasan produk dengan spesifikasi visual yang sama.

## 5. Model konsep

| Istilah | Arti | Catatan |
|---|---|---|
| **Mata kuliah** | Identitas akademik (mis. "Hukum Dagang") | Satu mata kuliah → **banyak** sesi jadwal + **banyak** tugas |
| **Jadwal** | Satu sesi kuliah yang **berulang setiap minggu**: hari, jam mulai, jam selesai, ruang opsional, menit pengingat | Bukan kejadian per tanggal; tidak punya tanggal |
| **Tugas** | Pekerjaan dengan judul, deadline absolut, status selesai, relasi opsional ke mata kuliah | Boleh tanpa mata kuliah ("Tugas mandiri") |
| **Menit pengingat** | Angka 0–1440 yang disimpan per jadwal | **Belum** memicu notifikasi apa pun sampai tahap 6 |

## 6. Kebutuhan fungsional

Prioritas: **P0** = wajib untuk tahap 1–5, **P1** = wajib untuk rilis, **P2** = "nantinya".

### 6.1 A. Hari Ini (layar utama)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-A1 | Menampilkan kelas berikutnya; bila sedang berlangsung, tampilkan status "Sedang berlangsung" dengan jam selesai | P0 |
| FR-A2 | Menampilkan nama mata kuliah, jam mulai–selesai, ruang, dan hitung mundur menuju kelas (atau informasi kelas selesai) | P0 |
| FR-A3 | Menampilkan jumlah kelas yang masih tersisa hari ini (termasuk kelas yang sedang berlangsung) | P0 |
| FR-A4 | Menampilkan tugas belum selesai diurutkan deadline menaik; tugas terlambat tetap di posisi teratas | P0 |
| FR-A5 | Setiap tugas menampilkan nama mata kuliah (atau "Tugas mandiri"), judul, tanggal deadline, dan badge status bertekstual | P0 |
| FR-A6 | Menangani keadaan: belum ada data (loading), gagal baca (error + "Coba lagi"), tidak ada kelas tersisa, tidak ada tugas, deadline terlambat, judul panjang | P0 |
| FR-A7 | Memakai waktu lokal perangkat; data dan hitung mundur diperbarui mengikuti perubahan waktu dan saat aplikasi kembali aktif | P0 |
| FR-A8 | Menyediakan akses yang terlihat ke pengelolaan Jadwal dan Tugas | P0 |
| FR-A9 | Saat kembali ke layar ini, data dibaca ulang dari SQLite sehingga perubahan dari layar pengelolaan langsung terlihat | P0 |

### 6.2 B. Mata kuliah & jadwal

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-B1 | Mata kuliah memiliki identitas tunggal yang dipakai bersama oleh semua jadwal dan tugasnya | P0 |
| FR-B2 | Jadwal berulang setiap minggu dan memuat: mata kuliah, hari (Senin–Minggu), jam mulai, jam selesai, ruang (opsional), menit pengingat | P0 |
| FR-B3 | Pengguna dapat melihat seluruh jadwal, menambah, mengubah, dan menghapus jadwal | P0 |
| FR-B4 | Penghapusan jadwal harus dikonfirmasi dan menyebut data yang dihapus | P0 |
| FR-B5 | Validasi menolak: nama kosong, format jam salah, jam selesai ≤ jam mulai, hari di luar 0–6, pengingat bukan bilangan bulat 0–1440, nama/ruang terlalu panjang | P0 |
| FR-B5a | Jadwal duplikat (mata kuliah sama + hari sama + jam mulai sama) ditolak dengan pesan yang mudah dipahami; perbandingan nama tidak membedakan kapitalisasi | P0 |
| FR-B6 | Perubahan jadwal langsung tercermin di layar Hari Ini (termasuk muncul/hilang dari "kelas berikutnya") | P0 |
| FR-B7 | Pengguna dapat mengelola mata kuliah secara eksplisit (daftar, ubah nama, hapus) | P2 — belum diminta untuk tahap saat ini |

### 6.3 C. Tugas

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-C1 | Tugas memuat judul, deadline (tanggal + jam), status selesai, relasi opsional ke mata kuliah | P0 |
| FR-C2 | Pengguna dapat melihat seluruh tugas (belum selesai dan selesai), menambah, mengubah, dan menghapus | P0 |
| FR-C3 | Pengguna dapat menandai tugas selesai dan membuka kembali | P0 |
| FR-C4 | Tugas selesai tidak muncul sebagai tugas tertunda di Hari Ini; membuka kembali mengembalikannya sesuai urutan deadline | P0 |
| FR-C5 | Relasi mata kuliah dapat dipilih dan dikosongkan kembali | P0 |
| FR-C6 | Tugas diurutkan menurut deadline menaik, terlambat diprioritaskan (deadline paling lampau lebih dulu) | P0 |
| FR-C7 | Data tugas bertahan setelah aplikasi ditutup dan dibuka kembali | P0 |
| FR-C8 | Penghapusan tugas harus dikonfirmasi | P0 |
| FR-C9 | Validasi menolak judul kosong, judul terlalu panjang, dan deadline yang tidak valid | P0 |

### 6.4 D. Notifikasi (tahap tersendiri)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-D1 | Menit pengingat per jadwal dapat disimpan dan diedit **sebelum** fitur notifikasi ada | P0 (bagian dari form jadwal) |
| FR-D2 | Notifikasi lokal terjadwal memakai `expo-notifications`: satu notifikasi berulang mingguan per jadwal, dijadwalkan ulang saat jadwal berubah, dibatalkan saat jadwal dihapus | P1 — **diimplementasikan (Tahap 6)**, belum diuji di perangkat |
| FR-D2a | Notification channel Android `class-reminders` (nama "Pengingat Kuliah", importance DEFAULT) dibuat **sebelum** izin diminta | P1 — diimplementasikan |
| FR-D2b | Izin diminta hanya lewat aksi pengguna ("Aktifkan pengingat"); penolakan izin tidak menghalangi CRUD jadwal | P1 — diimplementasikan |
| FR-D2c | Waktu pengingat = jam mulai kelas − menit pengingat, memakai jam dinding lokal perangkat; bila hasilnya melewati tengah malam, notifikasi jatuh pada hari sebelumnya | P1 — diimplementasikan |
| FR-D5 | `menit pengingat = 0` berarti notifikasi berbunyi **tepat saat kelas dimulai** (bukan berarti pengingat dimatikan) | P1 |
| FR-D6 | Tidak memakai exact alarm; pengiriman best-effort. Ketepatan dapat tergeser beberapa menit pada Android 12+ (Doze) | Batasan |
| FR-D3 | Tidak ada push notification dari server | Batasan |
| FR-D4 | Fitur notifikasi tidak boleh dianggap selesai tanpa implementasi **dan** pengujian di perangkat | Batasan |

### 6.5 E. Data, persistensi, penanganan error

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-E1 | Semua data operasional di SQLite lokal; tidak ada data pengguna di luar perangkat | P0 |
| FR-E2 | Skema berversi melalui `PRAGMA user_version` dan migrasi bertahap yang idempoten | P0 |
| FR-E3 | Migrasi tidak boleh menghapus/mengubah data pengguna; hanya boleh aditif + backfill | P0 |
| FR-E4 | Seed contoh hanya ditulis saat database pertama kali dibuat, tidak pernah menimpa data pengguna | P0 |
| FR-E5 | Semua penulisan lewat parameter terikat; tidak ada SQL yang dirangkai dari input pengguna | P0 |
| FR-E6 | Tidak ada SQL di komponen UI; akses data hanya melalui modul di `db/` | P0 |
| FR-E7 | Kegagalan simpan/hapus menampilkan pesan yang jelas tanpa menghilangkan isian pengguna; kegagalan baca menyediakan aksi "Coba lagi" | P0 |
| FR-E8 | Setelah simpan/hapus berhasil, form ditutup dan daftar dibaca ulang dari SQLite | P0 |

## 7. Kriteria penerimaan (dapat diuji)

Format: kondisi → hasil yang harus teramati. Semua langkah dapat diuji pada aplikasi yang berjalan di perangkat, atau pada lapisan data dengan SQLite nyata (untuk kriteria bernomor `DB`).

### 7.1 Hari Ini

| ID | Kriteria penerimaan |
|---|---|
| AC-A1 | Diberikan hari ini punya 3 kelas dan sekarang 09.20, ketika layar dibuka maka kartu menampilkan kelas 10.00 sebagai "Kelas berikutnya" beserta jam, ruang, dan hitung mundur. |
| AC-A2 | Diberikan sekarang berada di antara jam mulai dan selesai sebuah kelas, ketika layar dibuka maka label menjadi "Sedang berlangsung" dan footer menampilkan jam selesai — **tidak** ada hitung mundur negatif. |
| AC-A3 | Diberikan seluruh kelas hari ini sudah selesai, ketika layar dibuka maka kartu berisi "Kelas hari ini selesai." tanpa jam/ruang/hitung mundur, dan ringkasan menulis "Tidak ada kelas tersisa". |
| AC-A4 | Diberikan jadwal hari ini kosong seluruhnya, ketika layar dibuka maka tidak ada error; tampil state kosong yang sama seperti AC-A3. |
| AC-A5 | Diberikan 3 tugas belum selesai dengan deadline kemarin, hari ini, dan 2 hari lagi, ketika layar dibuka maka urutannya kemarin → hari ini → 2 hari lagi, dan badge-nya "Terlambat …" (merah), "Sisa … jam" (amber), "Sisa … hari" (netral). |
| AC-A6 | Diberikan sebuah tugas ditandai selesai dari layar Tugas, ketika kembali ke Hari Ini maka tugas tersebut tidak lagi muncul. |
| AC-A7 | Diberikan sebuah tugas dibuka kembali dari layar Tugas, ketika kembali ke Hari Ini maka tugas tersebut muncul pada posisi sesuai deadline-nya. |
| AC-A8 | Diberikan judul tugas sangat panjang (mis. 140 karakter), ketika ditampilkan maka teks membungkus dan badge deadline tidak tertimpa. |
| AC-A9 | Diberikan pembacaan database gagal, ketika layar dibuka maka tampil pesan "Jadwal belum dapat dimuat" + tombol "Coba lagi" yang berfungsi. |
| AC-A10 | Diberikan layar Hari Ini sedang terbuka, ketika aplikasi ditinggalkan lalu dibuka kembali (atau tanggal berganti), maka jam dan data diperbarui tanpa perlu menutup aplikasi. |
| AC-A11 | Diberikan pengguna baru saja menambah jadwal untuk hari ini, ketika kembali ke Hari Ini maka kartu/sisa kelas mengikuti data terbaru tanpa restart. |

### 7.2 Jadwal & mata kuliah

| ID | Kriteria penerimaan |
|---|---|
| AC-B1 | Menekan "Jadwal" di Hari Ini membuka daftar seluruh jadwal, dikelompokkan per hari, urut jam mulai. |
| AC-B2 | Menambah jadwal (nama, hari, jam mulai, jam selesai, ruang opsional, pengingat) menyimpan data, menutup form, dan jadwal baru terlihat di daftar. |
| AC-B3 | Mengubah jadwal menampilkan nilai lama di form; setelah disimpan, daftar menampilkan nilai baru. |
| AC-B4 | Menghapus jadwal menampilkan konfirmasi berisi nama mata kuliah; setelah dikonfirmasi jadwal hilang dari daftar dan dari Hari Ini. |
| AC-B5 | Mengirim form dengan nama kosong, jam `9:00`, jam selesai sebelum mulai, atau pengingat `abc`/`1441` menampilkan pesan error pada field terkait dan **tidak** menyimpan apa pun. |
| AC-B6 | Nama mata kuliah sama dengan kapitalisasi berbeda ("Hukum Dagang" vs "hukum dagang") tidak membuat mata kuliah kedua. |
| AC-B7 | Satu mata kuliah dapat memiliki dua sesi jadwal berbeda (mis. Senin dan Rabu) yang keduanya menunjuk identitas mata kuliah yang sama. (DB) |
| AC-B8 | Menghapus satu sesi jadwal tidak menghapus sesi lain dari mata kuliah yang sama, dan tidak menghapus tugas yang terkait mata kuliah itu. |
| AC-B9 | Jadwal yang baru dibuat muncul di daftar hari yang sesuai dan tidak muncul di hari lain. |
| AC-B10 | Menambah jadwal dengan mata kuliah, hari, dan jam mulai yang sama seperti jadwal yang sudah ada menampilkan pesan "jadwal sudah ada" dan **tidak** menambah baris; nama beda kapitalisasi juga ditolak; hari berbeda atau mata kuliah berbeda tetap diterima. |
| AC-B11 | Mengubah sebuah jadwal ke mata kuliah lain hanya memindahkan jadwal itu: sesi lain tetap pada mata kuliah lama, dan tugas yang menempel pada mata kuliah lama tidak berubah. |

### 7.3 Tugas

| ID | Kriteria penerimaan |
|---|---|
| AC-C1 | Menambah tugas (judul, tanggal, jam, mata kuliah opsional) menyimpan data, menutup form, dan tugas terlihat di daftar. |
| AC-C2 | Mengubah judul/deadline/mata kuliah mengganti nilai lama di database dan di daftar. |
| AC-C3 | Memilih mata kuliah menyimpan relasi; memilih chip yang sama sekali lagi mengosongkan relasi, dan baris menampilkan "Tugas mandiri". |
| AC-C4 | Menandai selesai memindahkan tugas ke bagian "Selesai"; membuka kembali mengembalikannya ke bagian "Belum selesai" pada urutan deadline yang benar. |
| AC-C5 | Menghapus tugas menampilkan konfirmasi; setelah dikonfirmasi tugas hilang dari daftar dan Hari Ini. |
| AC-C6 | Menutup aplikasi sepenuhnya lalu membukanya kembali: jumlah, judul, deadline, relasi, dan status selesai tidak berubah. |
| AC-C7 | Form dengan judul kosong tidak menyimpan apa pun dan menandai field judul. |

### 7.4 Notifikasi lokal

| ID | Kriteria penerimaan |
|---|---|
| AC-D1 | Layar Jadwal menampilkan status pengingat: "Pengingat kelas aktif" (dengan jumlah jadwal) atau "Pengingat belum aktif" + tombol **Aktifkan pengingat**. |
| AC-D2 | Menekan "Aktifkan pengingat" memunculkan dialog izin sistem (Android 13+ / iOS) setelah channel `class-reminders` dibuat; pada Android 10 tidak ada dialog khusus dan status langsung aktif. |
| AC-D3 | Bila izin ditolak: aplikasi tidak crash, jadwal tetap bisa ditambah/diubah/dihapus, dan status menjelaskan pengingat belum aktif. Bila izin tidak bisa diminta lagi, tersedia tombol **Buka Pengaturan**. |
| AC-D4 | Jadwal Senin 10.00 dengan pengingat 15 menit menghasilkan notifikasi berulang setiap Senin 09.45 (jam lokal), bukan tanggal tetap. |
| AC-D5 | Jadwal dengan pengingat yang melewati tengah malam (mis. Senin 07.00, 600 menit) berbunyi **Minggu 21.00** — bukan Senin. |
| AC-D6 | Mengubah jam mulai/hari/menit pengingat/mata kuliah/ruang lalu menyimpan: notifikasi lama dibatalkan dan diganti yang baru; hanya ada satu notifikasi per jadwal. |
| AC-D7 | Menghapus jadwal menghapus pengingatnya; jadwal lain tidak terpengaruh (termasuk sesi lain dari mata kuliah yang sama). |
| AC-D8 | Menutup dan membuka aplikasi berulang kali tidak menggandakan notifikasi. |
| AC-D9 | Notifikasi muncul saat aplikasi di latar belakang/tertutup (bukan hanya saat aplikasi dibuka). |
| AC-D10 | Isi notifikasi: judul "<Mata kuliah> akan dimulai"; isi menyebut jam mulai dan ruang; tanpa ruang, kalimat tetap natural. |

### 7.5 Data & persistensi

| ID | Kriteria penerimaan |
|---|---|
| AC-E1 | Membuka aplikasi berulang kali tidak menggandakan data contoh (4 jadwal, 4 tugas tetap 4). (DB) |
| AC-E2 | Database v1 yang berisi data pengguna dimigrasikan ke v2 tanpa kehilangan satu baris pun: judul, deadline, status selesai, jam, ruang, dan menit pengingat identik sebelum vs sesudah. (DB) |
| AC-E3 | Migrasi dijalankan dua kali berturut-turut tidak mengubah isi tabel apa pun. (DB) |
| AC-E4 | `PRAGMA user_version` sama dengan versi skema aplikasi setelah inisialisasi. (DB) |
| AC-E5 | Semua query penulisan memakai parameter terikat — dapat diperiksa dengan membaca `db/*.ts` (tidak ada interpolasi string dari input). |
| AC-E6 | Database yang versinya lebih baru daripada aplikasi tidak diturunkan otomatis; aplikasi menampilkan kegagalan yang jelas. (DB) |

## 8. Kebutuhan non-fungsional

| Aspek | Kebutuhan |
|---|---|
| Offline | Seluruh fungsi utama berjalan tanpa internet. Tidak ada request jaringan saat runtime. |
| Privasi | Tidak ada telemetri, analytics, atau unggahan data. Tidak ada kredensial di dalam repo. |
| Aksesibilitas | Semua status punya label teks (bukan hanya warna); target sentuh aksi ≥ 48×48 dp; teks mengikuti fontScale; kartu dibacakan sebagai satu kesatuan dengan waktu diucapkan sebagai jam, bukan deretan angka; safe area perangkat dipakai. |
| Tipografi & bahasa | Seluruh teks antarmuka berbahasa Indonesia, format jam 24 jam (`HH:mm`), tanggal panjang (`Senin, 26 Oktober 2026`). |
| Waktu | Jam lokal perangkat; tidak ada asumsi zona waktu kampus. Deadline disimpan sebagai epoch milidetik sehingga urutan tetap benar lintas zona waktu. |
| Performa | Layar Hari Ini tampil tanpa jeda berarti pada data puluhan jadwal/tugas; tidak ada polling jaringan; jam diperbarui tiap 30 detik. |
| Ketahanan | Kegagalan baca/tulis data tidak membuat aplikasi menutup diri tanpa penjelasan (ada error boundary + pesan). |
| Ukuran & dependency | Dependency seminimal mungkin; setiap penambahan harus punya alasan teknis tertulis. |

## 9. Desain & aksesibilitas (rujukan)

`DESIGN_BRIEF.md` adalah sumber kebenaran visual; token tidak diduplikasi di PRD ini.

Keputusan desain yang mengikat:

- `lib/tokens.ts` satu-satunya sumber nilai visual; `theme/useTheme.ts` hanya logika tema.
- Tanpa hex, ukuran font, radius, jarak, atau `fontWeight` literal di komponen.
- Gaya: minimalis, latar netral hangat, satu aksen eukaliptus, tipografi sistem, tanpa gradient/bayangan/glassmorphism.
- Hierarki Hari Ini: kartu kelas → ringkasan sisa kelas → daftar tugas.
- Warna semantik hanya untuk status (kelas, info, deadline dekat, terlambat, selesai) dan selalu disertai teks.
- Light & dark mode mengikuti tema sistem.

## 10. Data & arsitektur

### 10.1 Prinsip

1. **Lokal & persisten.** SQLite (`expo-sqlite`) di direktori dokumen aplikasi, nama file `hari-ini.db`.
2. **Berlapis.** `db/` = skema, migrasi, seed, query. `hooks/` = pembacaan data untuk layar. `components/` = tampilan. Tidak ada SQL di komponen.
3. **Berversi.** `PRAGMA user_version` menyimpan versi skema; setiap langkah migrasi berjalan sekali, di dalam transaksi.
4. **Idempoten & non-destruktif.** Migrasi hanya menambah; seed memakai `INSERT OR IGNORE` dengan id tetap.
5. **Terparameterisasi.** Semua nilai pengguna dikirim sebagai parameter terikat.
6. **Gagal dengan jelas.** Error dibaca/ditulis ditangkap di lapisan UI dan ditampilkan sebagai pesan, bukan crash senyap.

### 10.2 Skema saat ini (ringkas)

- v1: `schedules` (course_name, day_of_week 0–6, start_time `HH:mm`, end_time, room opsional, reminder_minutes 0–1440) dan `tasks` (title, deadline_at epoch ms, is_completed, schedule_id → schedules).
- v2: menambah tabel `courses` (identitas mata kuliah, nama unik tanpa membedakan kapitalisasi) serta kolom `schedules.course_id` dan `tasks.course_id`, lalu mem-backfill data lama.
- Kolom warisan `schedules.course_name` dan `tasks.schedule_id` dipertahankan demi data lama; bukan sumber kebenaran relasi lagi.

Detail kolom, constraint, dan urutan pernyataan migrasi ada di `db/schema.ts` dan `IMPLEMENTATION_STATUS.md`.

### 10.3 Audit relasi tugas ↔ mata kuliah

**Situasi awal (v1).** `tasks.schedule_id` menunjuk satu baris `schedules`, sementara nama mata kuliah hidup di baris itu. Karena satu baris jadwal = **satu sesi mingguan**, relasi ini tidak dapat mewakili mata kuliah:

1. Mata kuliah dengan dua sesi (kuliah + responsi) memaksa tugas memilih salah satu sesi.
2. Menghapus sesi tersebut menghilangkan relasi tugas (`ON DELETE SET NULL`), padahal mata kuliahnya masih ada.
3. Dua tugas untuk mata kuliah yang sama bisa tampak berasal dari mata kuliah berbeda.

**Kebutuhan produk yang benar.** Mata kuliah adalah **identitas**; jadwal dan tugas adalah **kejadian** yang menunjuk identitas itu. Satu mata kuliah → banyak jadwal, banyak tugas (FR-B1, AC-B7, AC-B8).

**Keputusan.** Menambahkan entitas `courses` dan memakai `course_id` sebagai relasi utama tugas maupun jadwal. `schedule_id` tidak lagi ditulis oleh UI.

**Status terhadap kebutuhan.** Skema saat ini (v2) **memenuhi** kebutuhan relasi: satu mata kuliah dapat memiliki beberapa jadwal dan beberapa tugas, dan menghapus satu sesi tidak memutus relasi tugas. Form jadwal memilih **identitas mata kuliah** dari daftar (chip) atau membuat yang baru secara eksplisit, sehingga salah ketik tidak lagi diam-diam memecah identitas. Keterbatasan yang tetap ada:

- `schedules.course_name` masih ditulis sebagai salinan nama (karena `NOT NULL` + `UNIQUE` warisan v1). Menghapusnya butuh pembangunan ulang tabel dan belum dilakukan.
- Belum ada aksi untuk **mengganti nama** identitas mata kuliah (FR-B7, P2). Untuk sekarang, mengganti nama berarti membuat mata kuliah baru dan memindahkan setiap jadwalnya; nama lama tetap ada selama masih dipakai tugas.

### 10.4 Kebutuhan migrasi & kriteria keberhasilan

Berlaku untuk setiap perubahan skema berikutnya:

1. Versi skema dinaikkan dan langkah migrasi ditambahkan berurutan; tidak mengubah langkah yang sudah dirilis.
2. Hanya operasi aditif (`CREATE TABLE`, `ADD COLUMN`, `CREATE INDEX`) + backfill. Tidak ada `DROP`, `DELETE`, atau pembangunan ulang tabel tanpa rencana pemindahan data yang diuji.
3. Seluruh langkah berjalan dalam satu transaksi bersama kenaikan `user_version`.
4. Seed tidak dijalankan ulang pada database yang sudah ada.
5. **Kriteria keberhasilan:** untuk database v1 berisi jadwal + tugas pengguna, setelah migrasi (a) jumlah baris jadwal dan tugas sama, (b) nilai `course_name`, `day_of_week`, `start_time`, `end_time`, `room`, `reminder_minutes`, `title`, `deadline_at`, `is_completed` identik, (c) setiap jadwal memiliki `course_id` yang valid, (d) tugas yang dulu menunjuk jadwal memperoleh `course_id` yang sesuai, (e) migrasi kedua tidak mengubah apa pun, (f) `user_version` sesuai.
6. Uji migrasi dilakukan pada **salinan** database, bukan database pengguna.

### 10.5 Seed

Seed ilustratif (4 jadwal, 4 tugas relatif terhadap hari seed) hanya ditulis oleh migrasi v1. Tidak boleh dipakai sebagai sumber data runtime, tidak boleh ditulis ulang, dan tidak boleh diubah untuk memenuhi skenario uji (skenario uji memakai data yang dibuat pengguna atau perubahan tanggal perangkat).

### 10.6 Penanganan error

| Titik | Perilaku wajib |
|---|---|
| Inisialisasi/migrasi gagal | Ditangkap error boundary, pesan jelas, aplikasi tidak masuk ke layar dengan data palsu |
| Baca data gagal | Pesan inline + "Coba lagi" (tanpa mengubah header) |
| Simpan/ubah/hapus gagal | Pesan di atas tombol aksi, isian tidak hilang, tombol bisa dicoba lagi |
| Data yang diminta sudah tidak ada | Pesan "tidak ditemukan" + arah untuk kembali, bukan layar kosong tanpa penjelasan |

## 11. Roadmap

Status mengacu pada **kode aktual**, bukan pada rencana. Rincian bukti ada di `IMPLEMENTATION_STATUS.md`.

| # | Tahap | Isi | Status |
|---|---|---|---|
| 1 | Fondasi Expo & design tokens | Scaffold Expo + Expo Router + TypeScript, `lib/tokens.ts`, `theme/useTheme.ts`, brief visual | **SELESAI** (kode) |
| 2 | Database SQLite, migrasi, seed | Skema, migrasi berversi, seed idempoten, lapisan baca | **SELESAI** (kode; v2 sudah ada) |
| 3 | Layar Hari Ini | Kartu kelas, sisa kelas, daftar tugas, state loading/error/kosong, waktu lokal | **SELESAI** (kode) · **BELUM DIUJI** di perangkat |
| 4 | CRUD mata kuliah, jadwal, tugas | Form & daftar jadwal, form & daftar tugas, relasi mata kuliah, migrasi v2 | **SEBAGIAN** — jadwal & tugas SELESAI di kode; layar kelola mata kuliah belum ada; semua **BELUM DIUJI** di perangkat |
| 5 | Pengujian native Android & kompatibilitas UI | Build EAS, pasang APK di Android 10, checklist `ANDROID_TESTING.md`, perbaikan temuan | **BELUM DIMULAI** (belum ada build/APK) |
| 6 | Notifikasi lokal | `expo-notifications`, channel, izin, penjadwalan ulang saat jadwal berubah, pembatalan saat dihapus | **SELESAI di kode** (`lib/classReminders.ts`, `lib/notifications.ts`, `lib/notificationScheduler.ts`, `lib/notificationSync.ts`, `hooks/useReminderStatus.ts`, `components/ReminderStatusCard.tsx`) · **BELUM DIUJI** di perangkat — perlu dev build baru |
| 7 | Penyempurnaan, regresi, persiapan rilis | Regresi menyeluruh, aksesibilitas, performa, ikon/splash final, rilis internal | **BELUM DIMULAI** |

Urutan ini mengikat: tahap berikutnya tidak dimulai sebelum tahap sebelumnya dilaporkan dan disetujui.

> **Catatan penomoran.** Percakapan proyek pernah menyebut pekerjaan CRUD + migrasi v2 sebagai "Tahap 5"
> (dengan Tahap 4 = build EAS). Tabel di atas adalah penomoran resmi dokumen ini: **CRUD = tahap 4**,
> **uji native Android = tahap 5**. Bila ada rujukan nomor tahap dari laporan lama, cocokkan dengan nama
> pekerjaannya, bukan nomornya.

## 12. Risiko, asumsi, pertanyaan terbuka

| # | Hal | Dampak | Rencana |
|---|---|---|---|
| R1 | Belum ada pengujian di perangkat Android | Bug runtime (picker tanggal, safe area, font besar) belum diketahui | Tahap 5: build EAS + checklist perangkat |
| R2 | `@react-native-community/datetimepicker` adalah modul native baru | Dev client lama di HP tidak memuatnya | Butuh build EAS baru sebelum uji tanggal/jam |
| R3 | ~~Duplikat jadwal hanya ditolak constraint SQLite~~ | — | **Ditutup pada Tahap 5B**: ditolak di lapisan `db/` dengan pesan berbahasa Indonesia (AC-B10) |
| R4 | Belum ada aksi ganti nama identitas mata kuliah | Untuk mengganti nama, pengguna memindahkan jadwal satu per satu dan nama lama tetap ada selama dipakai tugas | Ditutup oleh FR-B7 (P2) bila dibutuhkan |
| R5 | ~~`ANDROID_TESTING.md` masih checklist "tanpa CRUD"~~ | — | **Ditutup pada Tahap 5B**: dokumen ditulis ulang untuk CRUD + skema v2 |
| R6 | Tidak ada test suite di repo (uji sebelumnya berupa harness di luar repo) | Regresi tidak otomatis terdeteksi | Pertimbangkan test runner di tahap 7 |

## 13. Definisi selesai (per tahap)

Sebuah tahap dianggap selesai hanya jika **semua** terpenuhi:

1. Perilaku sesuai kebutuhan dan kriteria penerimaan tahap itu.
2. `npx tsc --noEmit` dan `npx expo lint` bersih pada kode terbaru.
3. Bundling Android (`npx expo export --platform android`) berhasil bila tahap menyentuh kode aplikasi.
4. Uji lapisan data dijalankan pada SQLite nyata dan hasilnya dilaporkan apa adanya.
5. `IMPLEMENTATION_STATUS.md` diperbarui.
6. Laporan menyebut file yang dibuat/diubah, hasil perintah yang benar-benar dijalankan, dan hal yang belum diuji.
7. Tidak ada commit/push tanpa permintaan eksplisit.

## 14. Riwayat dokumen

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1 | 2026-10-29 | Dokumen awal: audit repository, kebutuhan produk, kriteria penerimaan, audit relasi tugas–mata kuliah, roadmap berbasis kode aktual |
| 0.2 | 2026-10-29 | Tahap 5B: tambah FR-B5a (jadwal duplikat) + AC-B10/AC-B11, perjelas status relasi mata kuliah (pemilih identitas), tutup risiko R3 & R5 |
| 0.3 | 2026-10-30 | Tahap 6: notifikasi lokal — FR-D2a..D2c, FR-D5, FR-D6, AC-D1..AC-D10, status roadmap tahap 6 |
