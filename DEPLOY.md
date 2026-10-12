# Panduan Deploy Jejak Kode

Jejak Kode terdiri dari dua bagian yang dijalankan sebagai satu server:

- **Game** (React). Di-build menjadi file statis di `frontend/dist`.
- **Server** (FastAPI). Menyimpan akun, kelas, progres, dan LKPD, sekaligus menyajikan game.

Ada dua cara memakainya. Keduanya gratis.

| | Cara A: online (Render + Neon) | Cara B: server di laptop guru |
|---|---|---|
| Diakses dari | Mana saja, lewat internet | Perangkat yang tersambung ke WiFi atau LAN yang sama |
| Butuh internet saat kelas | Ya | Tidak |
| Tempat data | PostgreSQL di Neon | File `backend/jejak_kode.db` (SQLite) |
| Hal yang perlu diperhatikan | Server gratis "tidur" setelah 15 menit tidak dipakai dan butuh sekitar 1 menit untuk bangun | Laptop guru harus menyala dan server berjalan selama kelas |

Untuk uji coba penelitian di beberapa kelas atau sekolah, Cara A lebih praktis karena tidak bergantung pada satu laptop. Jika internet di sekolah tidak stabil, pakai Cara B.

---

## Kode pendaftaran guru

Siswa tidak bisa membuat akun guru. Akun guru hanya bisa dibuat dengan salah satu cara berikut:

1. **Lewat halaman awal game**, tab **Daftar guru**, dengan memasukkan *kode pendaftaran guru*. Kode ini diatur oleh pengelola server lewat variabel `KODE_DAFTAR_GURU`. Jika variabel ini kosong, tab Daftar guru tidak muncul dan pendaftaran guru tertutup.
2. **Lewat terminal** di komputer server: `python kelola.py buat-guru` (hanya untuk Cara B atau server yang punya akses terminal).

Pilih kode yang sulit ditebak, misalnya `pplg-smkn-2026-rahasia`, dan bagikan hanya kepada guru. Setelah semua guru terdaftar, kode ini boleh dikosongkan supaya pendaftaran guru tertutup.

---

## Cara A: online gratis (Render + Neon)

Render menjalankan server, Neon menyimpan basis datanya. Basis data perlu dipisah karena layanan gratis Render menghapus file setiap kali server dimulai ulang, jadi SQLite tidak bisa dipakai di sana.

### A1. Unggah proyek ke GitHub

Render mengambil kode dari GitHub. Jika folder proyek belum menjadi repository Git:

```bash
cd C:\laragon\www\jejak-kode
git init
git add .
git commit -m "Jejak Kode"
```

Lalu buat repository baru (boleh *private*) di github.com, dan ikuti perintah `git remote add origin ...` dan `git push -u origin main` yang ditampilkan GitHub. GitHub Desktop juga bisa dipakai.

File `.gitignore` sudah mengatur supaya `node_modules`, hasil build, file basis data, dan `backend/.env` tidak ikut terunggah.

### A2. Buat basis data di Neon

1. Daftar di [neon.com](https://neon.com) (paket Free, permanen).
2. Buat project baru. Pilih region **AWS Asia Pacific (Singapore)** supaya dekat dengan Indonesia dan dengan server Render.
3. Klik **Connect**, lalu salin *connection string*-nya. Bentuknya seperti ini:
   ```
   postgresql://neondb_owner:xxxx@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
   Alamat dengan atau tanpa `-pooler` sama-sama bisa dipakai.

Tabel-tabelnya dibuat otomatis oleh server saat pertama kali berjalan.

### A3. Deploy di Render

1. Daftar di [render.com](https://render.com) memakai akun GitHub.
2. Pilih **New** lalu **Blueprint**, kemudian pilih repository Jejak Kode. Render membaca file `render.yaml` di proyek ini (satu web service gratis, Docker, region Singapore).
3. Render meminta dua nilai:
   - `DATABASE_URL`: tempel connection string dari Neon.
   - `KODE_DAFTAR_GURU`: kode pendaftaran guru yang sudah dipilih.
4. Lanjutkan sampai proses build selesai (sekitar 3 sampai 6 menit). Alamat situsnya tampil di bagian atas halaman service, misalnya `https://jejak-kode-xxxx.onrender.com`.

Jika tidak memakai Blueprint, buat **New > Web Service** dengan pengaturan: Runtime **Docker**, Instance Type **Free**, Region **Singapore**, Health Check Path `/api/kesehatan`, lalu isi dua variabel di atas pada bagian *Environment*.

### A4. Membuat akun guru dan kelas

1. Buka alamat situs, pilih tab **Daftar guru**, isi kode pendaftaran guru, nama, username, dan kata sandi (minimal 8 karakter).
2. Di dasbor guru, buat kelas (misalnya `X PPLG 1`). Setiap kelas mendapat kode, misalnya `VEE-D7N`.
3. Tekan **Tampilkan di layar** untuk menampilkan kode itu besar-besar di proyektor. Siswa membuka situs, memilih **Daftar siswa**, lalu memasukkan kode kelas.
4. Setelah semua siswa terdaftar, pendaftaran kelas bisa ditutup dengan sakelar **Pendaftaran dibuka**.

### A5. Memperbarui game

Setiap kali perubahan di-*push* ke GitHub, Render membangun dan menjalankan versi baru secara otomatis. Data di Neon tidak terpengaruh.

### Catatan paket gratis

- **Server tidur.** Setelah 15 menit tanpa pengunjung, server Render gratis berhenti dan butuh sekitar 1 menit untuk bangun lagi. Buka situsnya beberapa menit sebelum kelas dimulai. Jatah 750 jam per bulan cukup untuk satu server yang menyala terus, jadi layanan pemantau gratis (misalnya cron-job.org) boleh dipakai untuk membuka `https://alamat-situs/api/kesehatan` tiap 10 menit selama jam sekolah.
- **Basis data.** Neon Free memberi 1 GB per project. Data Jejak Kode per siswa hanya puluhan kilobyte.
- **Cadangan data.** Untuk keperluan penelitian, unduh data tiap kelas secara berkala dari dasbor guru (tombol **Unduh data (CSV)**).

---

## Cara B: server di laptop guru (lab sekolah)

Kebutuhan: Python 3.10 ke atas (centang *Add python.exe to PATH* saat instalasi) dan Node.js 18 ke atas.

### B1. Build game (sekali, dan setiap kali kode game berubah)

```bash
cd C:\laragon\www\jejak-kode\frontend
npm install
npm run build
```

### B2. Siapkan server

```bash
cd C:\laragon\www\jejak-kode\backend
python -m pip install -r requirements.txt
copy env.contoh .env
```

Buka `backend\.env` dengan Notepad, isi `KODE_DAFTAR_GURU`, dan biarkan `DATABASE_URL` kosong supaya data disimpan di file `backend\jejak_kode.db`.

### B3. Jalankan server

```bash
cd C:\laragon\www\jejak-kode\backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Jika Windows Firewall bertanya, izinkan untuk jaringan *Private*. Biarkan jendela ini terbuka selama kelas.

### B4. Alamat untuk siswa

Jalankan `ipconfig` di Command Prompt dan lihat *IPv4 Address* pada adaptor WiFi, misalnya `192.168.1.10`. Siswa membuka `http://192.168.1.10:8000` dari komputer masing-masing. Guru boleh membuka `http://localhost:8000` di laptopnya sendiri.

Akun guru dibuat lewat tab **Daftar guru**, atau dari terminal:

```bash
python kelola.py buat-guru
```

### Cadangan data

Seluruh data ada di file `backend\jejak_kode.db`. Salin file ini (saat server dimatikan) untuk membuat cadangan.

---

## Mode pengembangan (dua terminal)

```bash
# terminal 1: server, otomatis memuat ulang saat kode berubah
cd backend
uvicorn main:app --reload --port 8000

# terminal 2: game, dengan hot reload
cd frontend
npm run dev
```

Buka http://localhost:5173. Permintaan ke `/api` diteruskan ke server di port 8000. Pengaturan server dibaca dari `backend/.env`.

---

## Perintah pengelolaan akun

Dijalankan di folder `backend`. Perintah ini memakai basis data yang sama dengan server (sesuai `DATABASE_URL`).

```bash
python kelola.py buat-guru            # membuat akun guru
python kelola.py reset-sandi bu.sari  # mengganti kata sandi akun mana pun
python kelola.py daftar               # melihat daftar guru, jumlah kelas, dan jumlah siswa
```

Kata sandi siswa juga bisa di-reset oleh guru dari dasbor (profil siswa, tombol **Reset kata sandi**). Siswa mendapat kata sandi sementara dan langsung diminta membuat kata sandi baru saat masuk.

---

## Keamanan yang sudah diterapkan

- Kata sandi disimpan dalam bentuk hash scrypt, tidak pernah disimpan apa adanya.
- Sesi masuk memakai cookie HttpOnly yang berlaku 14 hari, dan hanya dikirim lewat HTTPS ketika situs dibuka lewat HTTPS.
- Percobaan masuk yang salah dibatasi 8 kali per 10 menit untuk setiap username dari perangkat yang sama, dan percobaan kode kelas atau kode guru juga dibatasi.
- Guru hanya bisa melihat dan mengubah kelas serta siswa miliknya sendiri. Akun siswa tidak bisa membuka data dasbor.

---

## Masalah yang sering muncul

| Gejala | Penyebab dan solusi |
|---|---|
| Halaman lama terbuka, lalu muncul "Tidak bisa terhubung ke server" | Server Render sedang bangun dari tidur. Tunggu sekitar 1 menit, lalu muat ulang. |
| Semua akun hilang setelah server Render dimulai ulang | `DATABASE_URL` belum diisi, sehingga server memakai SQLite sementara. Log Render menampilkan pesan PERINGATAN. Isi `DATABASE_URL` dengan alamat Neon. |
| Tab Daftar guru tidak muncul | `KODE_DAFTAR_GURU` kosong. Isi variabel itu, atau buat akun guru dengan `kelola.py`. |
| Siswa mendapat pesan "Pendaftaran kelas ini sedang ditutup" | Buka lagi sakelar **Pendaftaran dibuka** di panel kelas. |
| Siswa lupa kata sandi | Guru membuka profil siswa di dasbor, lalu menekan **Reset kata sandi**. |
| Siswa di lab tidak bisa membuka alamat laptop guru | Pastikan satu jaringan, server dijalankan dengan `--host 0.0.0.0`, dan Windows Firewall mengizinkan Python. |
| Muncul layar "Main tanpa akun" | Game tidak menemukan server. Pada Cara B, pastikan server berjalan dan alamatnya memakai port 8000. |
