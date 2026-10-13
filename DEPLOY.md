# Panduan Deploy Jejak Kode

Susunannya sama dengan FitLearn:

| Bagian | Layanan | Isi |
|---|---|---|
| Game (frontend) | **Vercel** | React + Vite dari folder `frontend` |
| Server (backend) | **Railway** | FastAPI dari folder `backend` |
| Basis data | **Supabase** | PostgreSQL untuk akun, kelas, progres, dan LKPD |

```
Siswa dan guru ──> https://jejak-kode.vercel.app ──(/api/...)──> Railway (FastAPI) ──> Supabase (PostgreSQL)
```

Siswa dan guru hanya membuka alamat Vercel. Semua permintaan ke `/api/...` diteruskan
Vercel ke Railway (diatur di `frontend/vercel.json`). Karena browser hanya melihat satu
alamat, cookie login tetap berjalan di semua browser, termasuk Safari yang memblokir
cookie dari alamat lain.

Jika internet di sekolah tidak stabil, ada juga **Cara B: server di laptop guru** di bagian bawah.

---

## Kode pendaftaran guru

Siswa tidak bisa membuat akun guru. Akun guru hanya bisa dibuat dengan salah satu cara berikut:

1. Lewat halaman awal game, tab **Daftar guru**, dengan memasukkan *kode pendaftaran guru*.
   Kode ini diatur lewat variabel `KODE_DAFTAR_GURU` di server. Jika variabel ini kosong,
   tab Daftar guru tidak muncul.
2. Lewat terminal di komputer server: `python kelola.py buat-guru`.

Pilih kode yang sulit ditebak, misalnya `pplg-smkn-2026-rahasia`, dan bagikan hanya kepada guru.
Setelah semua guru terdaftar, kode ini boleh dihapus supaya pendaftaran guru tertutup.

---

## Cara A: Vercel + Railway + Supabase

Urutannya: Supabase dulu, lalu Railway, terakhir Vercel (karena Vercel perlu alamat Railway).

### A1. Unggah proyek ke GitHub

Folder proyek sudah menjadi repository Git. Simpan perubahan terbaru lalu kirim ke GitHub:

```bash
cd C:\laragon\www\jejak-kode
git add .
git commit -m "Akun, LKPD, dan deploy Vercel Railway Supabase"
git push
```

Jika belum punya repository di GitHub, buat dulu di github.com (boleh *private*), lalu ikuti
perintah `git remote add origin ...` dan `git push -u origin main` yang ditampilkan GitHub.
File `.gitignore` sudah mengatur supaya `node_modules`, hasil build, file basis data, dan
`backend/.env` tidak ikut terunggah.

### A2. Basis data di Supabase

1. Di [supabase.com](https://supabase.com), buat project baru. Pilih region
   **Southeast Asia (Singapore)**.
2. Buat *Database Password* dan catat. Supaya tidak repot, pakai huruf dan angka saja
   (karakter seperti `@ : / ? # %` harus diubah dulu sebelum dipakai di alamat basis data).
3. Setelah project siap, klik **Connect**, lalu pilih **Session pooler**.
   **Jangan pakai Direct connection.** Railway tidak bisa menjangkau alamat direct Supabase
   (alamatnya hanya IPv6). Alamat Session pooler bentuknya seperti ini:
   ```
   postgresql://postgres.abcdefghijkl:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```
4. Ganti `[YOUR-PASSWORD]` dengan password tadi (tanpa kurung siku). Alamat inilah yang
   nanti diisi di `DATABASE_URL`.

Tabel dibuat otomatis oleh server saat pertama kali berjalan. Server juga menyalakan
*Row Level Security* di semua tabel Jejak Kode, sehingga data siswa tidak bisa dibaca lewat
API publik Supabase. Server sendiri tetap bisa membaca dan menulis karena ia pemilik tabelnya.

### A3. Server di Railway

1. Di [railway.com](https://railway.com), pilih **New Project**, lalu **Deploy from GitHub repo**,
   dan pilih repository Jejak Kode.
2. Buka service yang terbentuk, masuk ke **Settings**, lalu isi **Root Directory** dengan `/backend`.
   Railway otomatis mengenali proyek Python (versi 3.12 dari file `backend/.python-version`),
   memasang isi `requirements.txt`, dan menjalankan `uvicorn main:app` untuk FastAPI.
3. Masih di **Settings**, pada bagian region, pilih **Southeast Asia (Singapore)** supaya
   server berada di kota yang sama dengan basis data Supabase. Jika server di luar negeri,
   setiap penyimpanan progres jadi lebih lambat.
4. Buka tab **Variables** dan tambahkan:
   - `DATABASE_URL` = alamat Session pooler dari Supabase
   - `KODE_DAFTAR_GURU` = kode pendaftaran guru
5. Di **Settings > Networking**, tekan **Generate Domain**. Hasilnya misalnya
   `jejak-kode-production.up.railway.app`.
6. (Disarankan) Di **Settings**, isi **Healthcheck Path** dengan `/api/kesehatan`.
7. Periksa dengan membuka `https://ALAMAT-RAILWAY/api/info` di browser. Hasilnya harus:
   ```json
   {"daftarGuru":true,"basisData":"postgresql"}
   ```
   Jika tertulis `"sqlite"`, berarti `DATABASE_URL` belum terbaca. Periksa lagi tab Variables.

### A4. Hubungkan Vercel ke Railway

Buka `frontend/vercel.json`, lalu ganti `GANTI-DENGAN-ALAMAT-RAILWAY.up.railway.app` dengan
alamat Railway dari langkah A3 (tanpa `https://` di depan, karena sudah ada di file):

```json
"destination": "https://jejak-kode-production.up.railway.app/api/:path*"
```

Simpan, lalu `git add .`, `git commit -m "Alamat backend"`, dan `git push`.

### A5. Game di Vercel

1. Di [vercel.com](https://vercel.com), pilih **Add New > Project**, lalu import repository Jejak Kode.
2. Isi **Root Directory** dengan `frontend`. Framework terdeteksi sebagai **Vite**
   (Build Command `npm run build`, Output Directory `dist`). Tidak perlu variabel lingkungan.
3. Tekan **Deploy**. Alamatnya misalnya `https://jejak-kode.vercel.app`.
4. Periksa `https://jejak-kode.vercel.app/api/info`. Hasilnya harus sama dengan langkah A3 nomor 7.

### A6. Akun guru dan kelas

1. Buka alamat Vercel, pilih tab **Daftar guru**, lalu isi kode pendaftaran guru, nama,
   username, dan kata sandi (minimal 8 karakter).
2. Di dasbor guru, buat kelas (misalnya `X PPLG 1`). Setiap kelas mendapat kode, misalnya `P43-4FN`.
3. Tekan **Tampilkan di layar** untuk menampilkan kode itu di proyektor. Siswa membuka alamat
   Vercel, memilih **Daftar siswa**, lalu memasukkan kode kelas.
4. Setelah semua siswa terdaftar, pendaftaran bisa ditutup dengan sakelar **Pendaftaran dibuka**.

### A7. Memperbarui game

Setiap `git push`, Vercel dan Railway membangun ulang otomatis. Data di Supabase tidak berubah.

### Biaya dan batas paket

| Layanan | Paket | Catatan |
|---|---|---|
| Vercel | Hobby (gratis) | Untuk proyek pribadi non-komersial, seperti skripsi. |
| Supabase | Free | 500 MB per project dan maksimal 2 project aktif (FitLearn sudah memakai satu). Project gratis **dijeda setelah 1 minggu tidak dipakai**. Jika dijeda, buka dashboard Supabase dan pulihkan project-nya sebelum kelas. |
| Railway | Free, Trial, atau Hobby | Free memberi kredit $1 per bulan, Trial memberi kredit $5 sekali, Hobby $5 per bulan (sudah termasuk pemakaian $5). Kredit dipakai bersama semua service di akun, termasuk backend FitLearn. |

Supaya kredit Railway hemat, nyalakan **Serverless** di pengaturan service (berlaku setelah
deploy berikutnya). Server akan tidur jika tidak dipakai sekitar 5 sampai 10 menit. Saat ada
yang membuka game, server bangun lagi. Selama itu game menampilkan *"Server sedang dinyalakan..."*
dan tersambung sendiri tanpa perlu memuat ulang halaman. Untuk jaga-jaga, buka game beberapa
menit sebelum kelas dimulai.

Untuk keperluan penelitian, unduh data tiap kelas secara berkala dari dasbor guru
(tombol **Unduh data (CSV)**) sebagai cadangan.

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

Buka `backend\.env` dengan Notepad, isi `KODE_DAFTAR_GURU`, dan biarkan `DATABASE_URL` kosong
supaya data disimpan di file `backend\jejak_kode.db`.

### B3. Jalankan server

```bash
cd C:\laragon\www\jejak-kode\backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Jika Windows Firewall bertanya, izinkan untuk jaringan *Private*. Biarkan jendela ini terbuka selama kelas.

### B4. Alamat untuk siswa

Jalankan `ipconfig` di Command Prompt dan lihat *IPv4 Address* pada adaptor WiFi, misalnya
`192.168.1.10`. Siswa membuka `http://192.168.1.10:8000` dari komputer masing-masing.
Guru boleh membuka `http://localhost:8000` di laptopnya sendiri.

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

Buka http://localhost:5173. Permintaan ke `/api` diteruskan ke server di port 8000
(diatur di `frontend/vite.config.js`). Pengaturan server dibaca dari `backend/.env`.
Untuk mencoba memakai basis data Supabase dari laptop, isi `DATABASE_URL` di `backend/.env`
dengan alamat Session pooler.

---

## Perintah pengelolaan akun

Dijalankan di folder `backend`. Perintah ini memakai basis data yang sama dengan server
(sesuai `DATABASE_URL` di `backend/.env`). Untuk mengelola akun di Supabase dari laptop,
isi dulu `DATABASE_URL` dengan alamat Session pooler.

```bash
python kelola.py buat-guru            # membuat akun guru
python kelola.py reset-sandi bu.sari  # mengganti kata sandi akun mana pun
python kelola.py daftar               # melihat daftar guru, jumlah kelas, dan jumlah siswa
```

Kata sandi siswa juga bisa di-reset oleh guru dari dasbor (profil siswa, tombol
**Reset kata sandi**). Siswa mendapat kata sandi sementara dan langsung diminta membuat
kata sandi baru saat masuk.

---

## Keamanan yang sudah diterapkan

- Kata sandi disimpan dalam bentuk hash scrypt, tidak pernah disimpan apa adanya.
- Sesi masuk memakai cookie HttpOnly yang berlaku 14 hari dan hanya dikirim lewat HTTPS
  saat situs dibuka lewat HTTPS.
- Percobaan masuk yang salah dibatasi per username (juga jika IP-nya berganti-ganti).
  Batas untuk kode kelas yang salah dibuat longgar per IP, karena satu kelas biasanya
  memakai satu IP sekolah yang sama.
- Jawaban `/api` tidak pernah disimpan di cache, termasuk di CDN Vercel.
- Guru hanya bisa melihat dan mengubah kelas serta siswa miliknya sendiri. Akun siswa
  tidak bisa membuka data dasbor.
- Tabel di Supabase memakai Row Level Security, jadi tidak terbuka lewat API publik Supabase.

---

## Masalah yang sering muncul

| Gejala | Penyebab dan solusi |
|---|---|
| Lama di layar *"Server sedang dinyalakan..."* | Server Railway sedang bangun dari tidur. Tunggu, game tersambung sendiri. |
| Muncul *"Server belum bisa dihubungi"* | Periksa alamat Railway di `frontend/vercel.json`, pastikan service Railway berjalan dan kreditnya belum habis, lalu tekan **Coba hubungkan lagi**. |
| `https://ALAMAT-RAILWAY/api/info` menunjukkan `"sqlite"` | `DATABASE_URL` belum diisi. Log Railway juga menampilkan pesan PERINGATAN. Isi `DATABASE_URL` lalu deploy ulang. |
| Log Railway: *Network is unreachable* atau *connection timed out* ke Supabase | Memakai alamat Direct connection. Ganti dengan alamat **Session pooler**. |
| Log Railway: *password authentication failed* | `[YOUR-PASSWORD]` belum diganti, atau password berisi karakter khusus. Ganti password database Supabase dengan huruf dan angka saja. |
| Semua permintaan gagal setelah lama tidak dipakai | Project Supabase dijeda karena tidak aktif seminggu. Pulihkan dari dashboard Supabase. |
| Tab Daftar guru tidak muncul | `KODE_DAFTAR_GURU` kosong di Railway. Isi variabel itu, atau buat akun guru dengan `kelola.py`. |
| Siswa mendapat pesan *"Pendaftaran kelas ini sedang ditutup"* | Buka lagi sakelar **Pendaftaran dibuka** di panel kelas. |
| Siswa lupa kata sandi | Guru membuka profil siswa di dasbor, lalu menekan **Reset kata sandi**. |
| Siswa di lab tidak bisa membuka alamat laptop guru (Cara B) | Pastikan satu jaringan, server dijalankan dengan `--host 0.0.0.0`, dan Windows Firewall mengizinkan Python. |

---

## Lampiran: file untuk deploy satu server

`Dockerfile`, `.dockerignore`, dan `render.yaml` adalah alternatif lama untuk menjalankan
game dan server dalam satu layanan (misalnya Render). Untuk susunan Vercel + Railway + Supabase
file-file ini tidak dipakai dan boleh dihapus.
