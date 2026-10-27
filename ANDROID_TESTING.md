# Build APK Android 10 — Expo EAS Cloud Build

Panduan ini menggantikan instruksi build lokal sebelumnya. **Tidak perlu** memasang Android
Studio, JDK, Android SDK, atau `adb`: kompilasi berjalan di server Expo (EAS Build).

- **SDK:** Expo 58.0.19 · React Native 0.88.0
- **expo-dev-client:** 58.0.15 (tetap terpasang, dipakai profil `development`)
- **applicationId:** `com.afterhours.kelashariini` · **versionCode:** 1
- **Android minimum:** `minSdkVersion 24` → **Android 10 (API 29) didukung**
- **Profil APK:** `preview` (internal distribution, `buildType: apk`)

---

## Status di workspace Arena

Build cloud **belum bisa dijalankan dari sandbox Arena**. Dua blocker yang benar-benar teruji:

1. **Belum login Expo** — `eas whoami` → `Not logged in`;
   `eas build` → `An Expo user account is required to proceed.`
2. **Jaringan diblokir** — dengan token apa pun, `api.expo.dev` gagal TLS:
   `OpenSSL SSL_connect: SSL_ERROR_SYSCALL` dan
   `request to https://api.expo.dev/graphql failed, reason: Client network socket disconnected
   before secure TLS connection was established`.

Karena nomor 2, **token Expo saja tidak cukup** di sandbox ini. Arena juga tidak menyediakan
konektor Expo, jadi akun Expo tidak bisa dihubungkan langsung ke workflow ini. Build harus
dijalankan dari komputer Anda (atau dari CI) — lihat langkah di bawah.

---

## 1. Prasyarat (ringan, tanpa Android SDK)

| Kebutuhan | Catatan |
|---|---|
| Node.js 22 LTS | https://nodejs.org |
| Git | untuk clone repo |
| Akun Expo (gratis) | https://expo.dev/signup — antrean build gratis tersedia |
| Internet | build berjalan di cloud |

---

## 2. Jalankan build (PowerShell / Terminal)

```bash
git clone https://github.com/4fterhours/to-do-list-as-a-double-degree.git
cd to-do-list-as-a-double-degree
git checkout arena/172d2bcb-to-do-list-as-a-double-degree

npm ci

# 1) Login (membuka browser). Ini menyimpan sesi di ~/.expo, bukan di repo.
npx eas-cli@latest login

# 2) Hubungkan proyek ke akun Anda. Perintah ini yang membuat
#    extra.eas.projectId di app.json. Jangan menuliskan project ID manual.
npx eas-cli@latest init

# 3) Build APK untuk Android 10
npx eas-cli@latest build --platform android --profile preview
```

`eas init` akan menanyakan konfirmasi pembuatan proyek baru bernama `kelas-hari-ini`.
Setelah selesai, `app.json` bertambah:

```json
"extra": { "eas": { "projectId": "<uuid dari Expo>" } }
```

**Untuk CI / non-interaktif**, gunakan token alih-alih login, dan jangan pernah
menyimpannya di repo:

```bash
export EXPO_TOKEN=<token dari https://expo.dev/settings/access-tokens>   # PowerShell: $env:EXPO_TOKEN="..."
npx eas-cli@latest build --platform android --profile preview --non-interactive
```

> Catatan keamanan: jangan menaruh token di source code, `eas.json`, prompt, atau log.
> Token hanya sebagai variabel lingkungan di mesin Anda.

---

## 3. Hasil build

- Progres dapat dipantau di terminal dan di `https://expo.dev/accounts/<akun>/projects/kelas-hari-ini/builds`.
- Setelah status **Finished**, halaman build menyediakan tombol **Install** / **Download APK**
  serta QR code. Tautan unduhan langsung berada di domain `exp.host`/`u.expo.dev`.
- Perkiraan waktu: 10–20 menit pada antrean gratis (antrean bisa lebih lama di jam sibuk).

**Pasang di HP Android 10:**
1. Buka tautan build di HP (atau scan QR dari halaman EAS).
2. Unduh APK.
3. Saat memasang, izinkan **"Install unknown apps"** untuk browser/file manager yang dipakai.
4. Buka aplikasi **Kelas Hari Ini**.

> APK `preview` bersifat mandiri (tidak butuh dev server). Jika ingin memeriksa isi database
> lewat panel devtools, build **profil `development`** lalu jalankan `npx expo start --dev-client`.
> Keduanya tidak memerlukan Android SDK.

---

## 4. Checklist pengujian di HP (Android 10)

### A. Aplikasi & database
- [ ] Aplikasi terbuka tanpa crash (tidak ada layar putih/merah).
- [ ] Tidak muncul pesan **"Jadwal belum dapat dimuat"**.
- [ ] Tampil 3 tugas dengan 3 badge berbeda: **Terlambat … jam** (merah), **Sisa … jam** (amber), **Sisa … hari** (netral).
- [ ] Tutup aplikasi (recent apps → swipe), buka lagi → jumlah tugas **tetap 3**, deadline & status tidak berubah (bukti seed tidak menggandakan / tidak reset).
- [ ] Matikan–hidupkan HP, buka aplikasi → tetap 3 tugas.
- [ ] Di aplikasi: tidak ada tombol tambah/edit/hapus (memang tidak ada CRUD).

### B. Tampilan
- [ ] **Safe area:** judul "Hari Ini" tidak tertutup status bar; konten bawah tidak tertutup gesture bar.
- [ ] **Light mode:** latar krem `#FAFAF7`, kartu/ringkasan terbaca, teks gelap.
- [ ] **Dark mode:** ubah tema sistem → latar gelap `#171D1A`, teks terang, badge tetap kontras.
- [ ] **Padding:** sisi kiri/kanan terasa lega (24 dp); di layar kecil tetap rapi.
- [ ] **Hierarki:** judul 32 → tanggal → kartu kelas → ringkasan → judul "Tugas" → baris tugas.
- [ ] **Teks panjang:** "Ringkasan Sengketa Laut Natuna" / "Metodologi Penelitian Hukum" membungkus, tidak terpotong ellipsis, tidak menimpa badge.
- [ ] **Font besar:** Settings → Display → Font size maksimum → tidak ada teks terpotong/tumpang tindih.
- [ ] **Scroll:** daftar bisa digulir; kartu, ringkasan, dan baris tugas tidak saling menimpa.
- [ ] **Badge selalu berteks** (bukan hanya warna).

### C. State per tanggal

Seed memakai jadwal **Senin (3 kelas)** dan **Kamis (1 kelas)**.

| State | Cara memunculkan |
|---|---|
| "Kelas hari ini selesai." + "Tidak ada kelas tersisa" | Uji pada hari **selain Senin/Kamis** (termasuk Selasa 27 Okt 2026) |
| "Kelas berikutnya" + countdown | Senin sebelum 10.00, atau Kamis sebelum 09.00 |
| "Sedang berlangsung" + "Selesai 11.40" | Senin 10.00–11.40 / 13.00–14.40 / 15.00–16.40; Kamis 09.00–10.40 |
| Tidak ada tugas | Tidak tersedia dari seed (jangan ubah seed untuk ini) |

Untuk melihat kartu kelas tanpa mengubah seed: ubah sementara **tanggal perangkat** ke hari
Senin/Kamis, atau uji pada hari tersebut. Kembalikan tanggal setelah selesai.

### D. Opsional — verifikasi isi database (tanpa adb)
1. Build profil `development`: `npx eas-cli@latest build -p android --profile development`.
2. Pasang APK, jalankan `npx expo start --dev-client` di komputer, hubungkan HP.
3. Buka panel **SQLite DevTools** dari dev server, lalu:

```sql
PRAGMA user_version;            -- harap 1
SELECT COUNT(*) FROM schedules; -- harap 4
SELECT COUNT(*) FROM tasks;     -- harap 4
```

Jika `adb` kebetulan tersedia di komputer Anda, alternatifnya:
`adb shell run-as com.afterhours.kelashariini ls -l files/SQLite/` → `hari-ini.db`.

---

## 5. Bila build gagal di cloud

| Gejala | Penyebab umum | Tindakan |
|---|---|---|
| `An Expo user account is required` | belum login | `npx eas-cli@latest login` |
| `projectId` tidak ditemukan | `eas init` belum dijalankan | jalankan `eas init` (jangan tulis UUID manual) |
| `android.versionCode is required` | `appVersionSource: local` | `versionCode` sudah `1` di `app.json` |
| Build gagal di langkah Gradle | masalah dependency/native | kirim log build; jangan ubah `targetSdk` sembarangan |
| Antrean lama | kuota gratis | tunggu, atau ulangi di luar jam sibuk |
