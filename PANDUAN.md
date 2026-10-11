# Panduan Instalasi — Nirbana Collection Persada

## A. Backend (Google Apps Script)
1. Buka https://script.google.com → Proyek Baru → ganti nama `Code.gs` jadi `Kode`, tempel isi `backend/Kode.gs`.
2. Pilih fungsi `setupAppEnvironment` → Run (**hanya sekali**) → izinkan akses. Lihat **Execution Log**: ada URL Spreadsheet, email Owner, dan **password Owner awal**.
3. Deploy → New deployment → Web app → Execute as **Me**, access **Anyone** → salin URL `/exec`.
4. Update berikutnya: Deploy → **Manage deployments → ✏️ Edit → New version** (URL tetap sama).

## B. Reset lewat backend (editor GAS, tidak bisa lewat web)
- **Reset data dummy:** jalankan `resetDummyData()` (user tidak dihapus).
- **Reset password superadmin:** edit baris di editor lalu jalankan, mis. `resetPasswordSuperadmin('owner@ncp.local','PassBaru#123')`. Tanpa argumen sandi, sistem membuat sandi acak dan menampilkannya di log. Semua sesi lama otomatis dicabut.

## C. Frontend → GitHub Pages (pakai terminal, jangan "Upload files" di web)
1. Edit `frontend/js/config.js`, isi `GAS_URL` dengan URL `/exec`.
2. Buat repo **Public** kosong di github.com. Lalu, di dalam folder `frontend`:
```
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```
(Password = Personal Access Token, scope `repo`. Mengetik password tidak menampilkan karakter — itu normal.)
3. Repo → Settings → Pages → Deploy from branch → `main` `/ (root)` → centang Enforce HTTPS.
4. Redeploy: `git add .` → `git commit -m "update"` → `git push`.

## D. Notifikasi, Template Dokumen, Migrasi
- **WhatsApp:** menu WhatsApp → isi token Fonnte → centang aktif → Simpan. Trigger 1 menit sudah dipasang saat setup.
- **Template dokumen:** buat Google Docs dengan `{{NOMOR}} {{NAMA_CUSTOMER}} {{RINCIAN}} {{TOTAL}} {{SISA}}` → menu Template Dok → Pindai → simpan dengan kode `INVOICE`.
- **Migrasi:** menu Migrasi → tempel URL spreadsheet lama → Pindai (dry-run) → Jalankan Import. Ulangi sebelum cutover (delta).

## E. Pembaruan Tahap 2 (proofing, unggah, master data, laporan)
- **Instalasi baru:** cukup `setupAppEnvironment()` — semua sheet baru ikut terbuat.
- **Sudah terpasang sebelumnya:** jalankan `migrasiSkema()` SEKALI di editor (menambah sheet Proofing, Files, Inventory, Supplier, Pengeluaran + data contoh), lalu **Deploy → Manage deployments → ✏️ Edit → New version**.
- Akun demo: `karyawan@ncp.local` dan `graha@contoh.id` (customer), sandi `Demo#1234`. **Nonaktifkan lewat Master Data → Pengguna sebelum dipakai sungguhan.**
- Frontend: salin juga `js/modul.js` dan `css/style.css` terbaru, lalu `git add .` → `git commit -m "tahap 2"` → `git push`.
