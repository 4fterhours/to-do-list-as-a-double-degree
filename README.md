# Kelas Hari Ini

Aplikasi mobile pribadi untuk mahasiswa: jadwal kuliah mingguan dan tugas akademik dalam satu layar.
Dibangun dengan React Native + Expo (SDK 58) + TypeScript + Expo Router, data 100% lokal di SQLite.
Tanpa akun, backend, atau sinkronisasi cloud.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [PRD.md](./PRD.md) | Kebutuhan produk, kriteria penerimaan, batasan produk, roadmap |
| [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | Status nyata per fitur, pengujian yang sudah/belum dilakukan, masalah diketahui |
| [DESIGN_BRIEF.md](./DESIGN_BRIEF.md) | Sumber kebenaran visual + blok design token |
| [ANDROID_TESTING.md](./ANDROID_TESTING.md) | Cara build APK lewat EAS dan checklist uji di HP Android |
| [AGENTS.md](./AGENTS.md) | Aturan kerja untuk agen/robot coding |

## Status singkat

- **Selesai di kode:** fondasi Expo & design token, lapisan SQLite (skema v2 + migrasi + seed), layar Hari Ini.
- **Selesai di kode, menunggu review:** CRUD jadwal dan tugas + migrasi v1→v2. Layar kelola mata kuliah belum ada.
- **Belum dimulai:** pengujian native Android (belum ada build/APK), notifikasi lokal.

Implementasi dan pengujian dipisah: CRUD sudah ada di kode tetapi **belum pernah dijalankan pada APK/perangkat**.

Rincian per fitur dan hasil perintah ada di [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md).

## Menjalankan

```bash
npm ci
npx expo start        # dev server
npx tsc --noEmit      # typecheck
npx expo lint         # lint
```

Build APK Android dilakukan lewat EAS Build — lihat [ANDROID_TESTING.md](./ANDROID_TESTING.md).
Web bukan target produk: SQLite di browser butuh header COOP/COEP yang tidak dikirim dev server Metro.

## Struktur

```
src/app/       route Expo Router (/, /jadwal, /tugas)
components/    tampilan (Hari Ini + layar pengelolaan)
db/            skema, migrasi, seed, akses data SQLite
hooks/         pembacaan data untuk layar
lib/           tokens.ts (nilai visual), time.ts, validation.ts
theme/         logika light/dark
```
