# Pengujian APK Android 10 — Expo EAS Cloud Build

Panduan build & uji aplikasi **Kelas Hari Ini** versi CRUD (skema database **v2**).

Panduan ini menggantikan instruksi build lokal sebelumnya. **Tidak perlu** memasang Android
Studio, JDK, Android SDK, atau `adb`: kompilasi berjalan di server Expo (EAS Build).

| Item | Nilai |
|---|---|
| SDK | Expo 58.0.19 · React Native 0.88.0 |
| expo-dev-client | 58.0.15 (tetap terpasang, dipakai profil `development`) |
| Picker tanggal/jam | `@react-native-community/datetimepicker` 9.2.1 (**modul native**) |
| applicationId | `com.afterhours.kelashariini` · versionCode `1` |
| Android minimum | `minSdkVersion 24` → **Android 10 (API 29) didukung** |
| Versi skema database | **`PRAGMA user_version = 2`** |
| Profil APK | `preview` (internal distribution, `buildType: apk`) |

> **APK lama tidak bisa dipakai untuk menguji versi ini.** `@react-native-community/datetimepicker`
> adalah modul native yang baru ditambahkan, jadi ia hanya ikut terkompilasi pada build EAS **baru**.
> Bila APK sebelumnya masih terpasang, **copot dulu** lalu pasang APK hasil build terbaru.

---

## 1. Apa yang bisa dan tidak bisa diuji di sini

Dua lapisan pengujian ini berbeda dan **tidak saling menggantikan**:

| Lapisan | Dijalankan di | Membuktikan | Tidak membuktikan |
|---|---|---|---|
| **Logika database (Node)** | sandbox/komputer, `node:sqlite` | migrasi v1→v2 mempertahankan data, CRUD SQL, seed idempoten, validasi form murni, urutan deadline | tampilan, gesture, picker native, safe area, performa di HP |
| **Runtime Android (APK)** | emulator Android 10 atau HP Android 10 | semua hal di atas **plus** UI, dialog native, persistensi setelah app ditutup, dark mode, font besar | — |

Uji Node **bukan** pengganti uji perangkat. Sampai APK terbaru dipasang dan checklist di §5
dijalankan, status UI tetap **belum diuji**.

---

## 2. Status di workspace Arena

Build cloud **belum bisa dijalankan dari sandbox Arena**. Dua blocker yang benar-benar teruji:

1. **Belum login Expo** — `eas whoami` → `Not logged in`;
   `eas build` → `An Expo user account is required to proceed.`
2. **Jaringan diblokir** — dengan token apa pun, `api.expo.dev` gagal TLS:
   `OpenSSL SSL_connect: SSL_ERROR_SYSCALL` dan
   `request to https://api.expo.dev/graphql failed, reason: Client network socket disconnected
   before secure TLS connection was established`.

Karena nomor 2, **token Expo saja tidak cukup** di sandbox ini. Build harus dijalankan dari
komputer Anda (atau CI) — lihat langkah di bawah.

`app.json` saat ini **belum** memiliki `extra.eas.projectId`; `eas init` akan membuatnya.

---

## 3. Prasyarat & perintah build

| Kebutuhan | Catatan |
|---|---|
| Node.js 22 LTS | https://nodejs.org |
| Git | untuk clone repo |
| Akun Expo (gratis) | https://expo.dev/signup — antrean build gratis tersedia |
| Internet | build berjalan di cloud |
| Emulator Android 10 (API 29) **atau** HP Android 10 | untuk menguji APK |

```bash
git clone https://github.com/4fterhours/to-do-list-as-a-double-degree.git
cd to-do-list-as-a-double-degree
git checkout arena/172d2bcb-to-do-list-as-a-double-degree

npm ci

# 1) Login (membuka browser). Sesi disimpan di ~/.expo, bukan di repo.
npx eas-cli@latest login

# 2) Hubungkan proyek ke akun Anda (membuat extra.eas.projectId di app.json).
npx eas-cli@latest init

# 3) Build APK untuk Android 10
npx eas-cli@latest build --platform android --profile preview
```

Untuk CI / non-interaktif, gunakan token alih-alih login dan **jangan** menyimpannya di repo:

```bash
export EXPO_TOKEN=<token dari https://expo.dev/settings/access-tokens>   # PowerShell: $env:EXPO_TOKEN="..."
npx eas-cli@latest build --platform android --profile preview --non-interactive
```

> Catatan keamanan: jangan menaruh token di source code, `eas.json`, prompt, atau log.
> Token hanya sebagai variabel lingkungan di mesin Anda.

**Pasang di emulator Android 10:**

1. Unduh APK dari halaman build EAS (tombol *Install*/*Download*).
2. Emulator: seret (drag-and-drop) file APK ke jendela emulator, atau
   `adb install -r nama-file.apk` bila `adb` tersedia.
3. Buka aplikasi **Kelas Hari Ini**.

**Pasang di HP Android 10:** buka tautan build di HP → unduh APK → izinkan
*"Install unknown apps"* untuk browser/file manager → buka aplikasi.

> APK `preview` bersifat mandiri (tidak butuh dev server). Bila ingin memeriksa isi database
> lewat panel devtools, build profil `development` lalu jalankan `npx expo start --dev-client`.

---

## 4. Sebelum menguji: pahami data awal (seed)

Database dibuat saat aplikasi pertama kali dibuka:

- **4 jadwal contoh**: Hukum Dagang (Senin 10.00–11.40, B-204), Pemrograman Web
  (Senin 13.00–14.40, Lab Komputer 2), Hukum Internasional (Senin 15.00–16.40, C-101),
  Metodologi Penelitian Hukum (Kamis 09.00–10.40, ruang kosong).
- **4 tugas contoh**: kemarin 23.59 (terlambat), hari ini 23.59 (amber), +2 hari 23.59 (netral),
  dan satu tugas hari ini 12.00 yang **sudah selesai**.
- Deadline dihitung saat database **pertama kali dibuat**, bukan setiap app dibuka.

**Untuk mulai dari kondisi bersih** (hanya bila Anda memang ingin menghapus data uji): hapus data
aplikasi lewat Settings → Apps → Kelas Hari Ini → *Storage* → *Clear storage*, atau uninstall lalu
pasang ulang APK. Database tidak pernah direset otomatis oleh aplikasi.

---

## 5. Checklist pengujian di APK terbaru

Centang hanya yang benar-benar diamati. Bila satu langkah gagal, catat langkah keberapa.

### A. Aplikasi & database

- [ ] Aplikasi terbuka tanpa crash (tidak ada layar putih/merah) dan menampilkan **Hari Ini**.
- [ ] Tidak muncul pesan galat "Jadwal belum dapat dimuat".
- [ ] Terlihat **3 tugas belum selesai** dengan badge berbeda: *Terlambat …* (merah),
      *Sisa … jam* (amber), *Sisa … hari* (netral). Tugas yang sudah selesai **tidak** tampil.
- [ ] Di bawah tanggal ada dua tombol: **Jadwal** dan **Tugas**.

### B. CRUD jadwal — tambah

- [ ] Ketuk **Jadwal** → muncul daftar jadwal dikelompokkan per hari.
- [ ] Ketuk **Tambah jadwal** → form terbuka; chip **hari** dan chip **mata kuliah** bisa digulir.
- [ ] Membuat jadwal baru: pilih **Mata kuliah baru** → ketik nama → pilih hari → atur jam mulai &
      jam selesai lewat **dialog picker native** → isi ruang (opsional) → pengingat `15` → **Simpan**.
- [ ] Setelah simpan, form tertutup, daftar menampilkan jadwal baru pada hari yang benar.
- [ ] Jadwal baru untuk **hari ini** muncul di layar Hari Ini (kartu kelas berikutnya / sisa kelas).
- [ ] Picker tanggal/jam menampilkan dialog native; tombol *Batal* menutup dialog tanpa mengubah nilai.

### C. CRUD jadwal — ubah, hapus, validasi

- [ ] Ketuk salah satu baris jadwal → form terisi nilai lama (mata kuliah terpilih, hari, jam, ruang).
- [ ] Ubah jam selesai → **Simpan** → daftar menampilkan jam baru; Hari Ini ikut berubah.
- [ ] Ketuk **Hapus** → muncul dialog konfirmasi berisi nama mata kuliah → *Hapus jadwal* →
      baris hilang dari daftar dan dari Hari Ini.
- [ ] Validasi: kosongkan nama mata kuliah / set jam selesai ≤ jam mulai / isi pengingat `abc` atau
      `1441` → muncul pesan galat pada field, dan data **tidak** tersimpan.
- [ ] **Jadwal duplikat**: tambah jadwal dengan mata kuliah yang sama, hari yang sama, dan jam mulai
      yang sama seperti jadwal yang sudah ada → muncul pesan
      *"Jadwal mata kuliah ini pada hari dan jam mulai tersebut sudah ada…"* dan tidak ada baris baru.
- [ ] Duplikat dengan kapitalisasi berbeda (`hukum dagang`) juga ditolak.

### D. CRUD tugas

- [ ] Ketuk **Tugas** → daftar terbagi **Belum selesai** dan **Selesai**.
- [ ] **Tambah tugas**: judul + tanggal (picker) + jam (picker) + mata kuliah opsional → **Simpan**.
- [ ] Tugas baru muncul di daftar dan (bila belum selesai) di layar Hari Ini sesuai deadline.
- [ ] **Ubah tugas**: ubah judul dan deadline → tersimpan dan urutan menyesuaikan deadline baru.
- [ ] **Relasi mata kuliah**: pilih chip mata kuliah → tersimpan; ketuk chip yang sama sekali lagi →
      relasi kosong dan baris menampilkan **Tugas mandiri**.
- [ ] **Tandai selesai**: tugas pindah ke bagian *Selesai* dan hilang dari Hari Ini.
- [ ] **Buka kembali**: tugas kembali ke *Belum selesai* pada posisi sesuai deadline dan muncul lagi
      di Hari Ini.
- [ ] **Hapus tugas** memakai dialog konfirmasi; setelah dikonfirmasi tugas hilang dari daftar.
- [ ] Judul sangat panjang (mis. tempel 100+ karakter) membungkus, tidak menimpa badge deadline.

### E. Identitas mata kuliah (relasi tugas ↔ jadwal)

- [ ] Buat dua jadwal untuk mata kuliah yang sama pada hari berbeda (**pilih chip mata kuliah yang
      sudah ada**, bukan membuat baru) → daftar menunjukkan dua sesi dengan nama sama.
- [ ] Buat tugas untuk mata kuliah itu → baris tugas menampilkan nama mata kuliah yang sama.
- [ ] Hapus **salah satu** sesi jadwal → sesi lain tetap ada, dan tugas tetap menampilkan mata kuliah
      tersebut (relasi tidak ikut terhapus).
- [ ] Saat mengubah jadwal, memilih mata kuliah lain hanya memindahkan jadwal itu; tugas tetap pada
      mata kuliah asalnya.

### F. Persistensi & seed

- [ ] Buat 1 jadwal dan 1 tugas baru, lalu tutup aplikasi (recent apps → swipe) dan buka lagi →
      keduanya **masih ada**, jumlah data contoh tidak bertambah (bukan 8 jadwal).
- [ ] Matikan–hidupkan emulator/HP → data tetap sama.
- [ ] Tandai satu tugas selesai, tutup & buka aplikasi → status selesai tetap tersimpan.

### G. Tampilan & aksesibilitas

- [ ] **Safe area:** judul "Hari Ini" tidak tertutup status bar; tombol bawah tidak tertutup gesture bar.
- [ ] **Light mode:** latar krem, teks gelap; **Dark mode:** ubah tema sistem → latar gelap, badge
      tetap kontras.
- [ ] **Padding** 24 dp terasa lega; pada layar sempit (< 360 dp) menjadi 16 dp dan tetap rapi.
- [ ] **Font besar** (Settings → Display → Font size maksimum): tidak ada teks terpotong atau tombol
      yang saling menimpa, termasuk di form.
- [ ] **Scroll:** daftar jadwal/tugas dan form bisa digulir sampai tombol **Simpan** terlihat.
- [ ] **Keyboard** tidak menutupi field yang sedang diisi di form.
- [ ] Semua badge status berteks (bukan hanya warna).
- [ ] Tombol kembali di form mengembalikan ke daftar tanpa menyimpan.

### H. State per tanggal (kartu kelas)

Seed memakai jadwal **Senin (3 kelas)** dan **Kamis (1 kelas)**.

| State | Cara memunculkan |
|---|---|
| "Kelas berikutnya" + hitung mundur | Senin sebelum 10.00, atau Kamis sebelum 09.00 |
| "Sedang berlangsung" + "Selesai 11.40" | Senin 10.00–11.40 / 13.00–14.40 / 15.00–16.40; Kamis 09.00–10.40 |
| "Kelas hari ini selesai." + "Tidak ada kelas tersisa" | Hari selain Senin/Kamis, atau Senin/Kamis setelah jam terakhir |

Untuk melihat state tertentu tanpa mengubah seed: ubah sementara tanggal/jam emulator, atau buat
jadwal sendiri lewat **Jadwal → Tambah jadwal** (cara yang disarankan). Kembalikan setelan setelah selesai.

### I. Bila badge deadline terasa tidak cocok dengan jam di layar

Label tanggal (`Hari ini` / `Kemarin`) dan badge (`Sisa … jam` / `Terlambat … jam`) memakai `now`
yang **sama**, jadi keduanya tidak dapat berbeda sumber. Bila angkanya terasa aneh, periksa jam &
zona waktu emulator/perangkat lebih dulu — bukan datanya:

```bash
adb shell date                                  # jam + zona waktu sistem
adb shell getprop persist.sys.timezone          # zona waktu
adb shell settings get system time_12_24        # 12 vs 24 jam pada status bar
adb logcat -s ReactNativeJS:V                   # pesan error aplikasi
```

Deadline contoh dihitung **saat database pertama kali dibuat**, bukan setiap aplikasi dibuka. Jadi
tanggal relatif ("Hari ini", "Kemarin") hanya muncul selama perangkat masih di hari yang sama dengan
hari seed; setelah itu tanggal tampil absolut (mis. `30 Oktober, 23.59`) — itu perilaku benar.

---

## 6. Pemeriksaan isi database di perangkat (opsional)

Profil `development`:

```bash
npx eas-cli@latest build -p android --profile development
npx expo start --dev-client
```

Panel **SQLite DevTools** di dev server hanya bisa membuka database jika run-time mengizinkan
(Ingat: bila panel tidak tersedia, lewati langkah ini — bukan kegagalan aplikasi).

Bila `adb` tersedia:

```bash
adb shell run-as com.afterhours.kelashariini ls -l files/SQLite/   # hari-ini.db
```

Ekspektasi untuk database baru (belum ada data uji):

| Perintah | Harapan |
|---|---|
| `PRAGMA user_version;` | `2` |
| `SELECT COUNT(*) FROM schedules;` | `4` |
| `SELECT COUNT(*) FROM tasks;` | `4` |
| `SELECT COUNT(*) FROM courses;` | `4` (satu per nama mata kuliah seed) |
| `SELECT id, name FROM courses ORDER BY name;` | Hukum Dagang, Hukum Internasional, Metodologi Penelitian Hukum, Pemrograman Web |
| `SELECT COUNT(*) FROM schedules WHERE course_id IS NULL;` | `0` |
| `SELECT COUNT(*) FROM tasks WHERE is_completed = 1;` | `1` |
| `PRAGMA foreign_key_check;` | tidak ada baris |

Setelah melakukan CRUD, angka-angka itu berubah sesuai data yang Anda buat — itu benar. Yang tidak
boleh terjadi: `course_id` bernilai `0`, atau baris jadwal dengan `course_id` yang tidak ada di
`courses`.

---

## 7. Bila build gagal di cloud

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| `An Expo user account is required` | belum login | `npx eas-cli@latest login` |
| `projectId` tidak ditemukan | `eas init` belum dijalankan | jalankan `eas init` (jangan tulis UUID manual) |
| `android.versionCode is required` | `appVersionSource: local` | `versionCode` sudah `1` di `app.json` |
| Build gagal saat mengompilasi modul native | dependency native belum ter-resolve | kirim log build; jangan ubah `targetSdk` sembarangan |
| Aplikasi crash saat membuka form tanggal | APK lama (tanpa `datetimepicker`) | build ulang lewat EAS, copot APK lama |
| Antrean lama | kuota gratis | tunggu, atau ulangi di luar jam sibuk |

---

## 8. Setelah pengujian

Catat hasil di tiket/PR, lalu perbarui `IMPLEMENTATION_STATUS.md` §3 (status uji per fitur), §5
(pengujian yang berhasil beserta konteks perangkat), dan §6 (yang masih belum diuji). Jangan
menaikkan status menjadi "teruji di perangkat" sebelum checklist di atas benar-benar dijalankan.
