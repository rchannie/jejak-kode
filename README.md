# Jejak Kode

Prototipe game edukasi 2D bergaya pixel art untuk penelitian
"Rancang Bangun Game Edukasi Berbasis Visualisasi Eksekusi Kode dengan Model
Guided Inquiry untuk Meningkatkan Computational Thinking Siswa SMK".

Siswa belajar dasar bahasa C dengan memprogram Bit, robot piket sekolah. Setiap
pernyataan dijalankan satu per satu sehingga siswa bisa melihat baris yang aktif,
hasil kondisi, isi variabel beserta tipenya, jumlah putaran perulangan, dan
keluaran `printf`.

## Isi prototipe

Level dikelompokkan ke dalam tiga bab. Bab Dasar dikerjakan lebih dulu sebelum
siswa masuk ke percabangan dan perulangan.

| Bab | Level | Tempat | Konsep | Indikator CT yang ditekankan |
|---|---|---|---|---|
| Dasar | 1 | Lorong kelas X | Urutan perintah (struktur `int main()`, titik koma) | Algoritma |
| Dasar | 2 | Lorong kelas X | Variabel `int`, penugasan, operator aritmetika, `printf` | Abstraksi |
| Percabangan | 3 | Taman depan | Percabangan `if` | Abstraksi |
| Percabangan | 4 | Ruang kelas X PPLG 1 | Percabangan `if-else` | Algoritma |
| Perulangan | 5 | Perpustakaan | Perulangan `for` | Pengenalan pola |
| Perulangan | 6 | Lorong kelas X | `for` dengan `if` dan `printf` | Dekomposisi dan abstraksi |

Isi singkat level dasar:

- **Level 1, Hari Pertama Bit.** Bit memungut sampah di lorong hanya dengan
  `maju();` dan `pungut();`. Siswa menebak berapa sampah yang terpungut dari kode
  yang urutannya kurang tepat, memperbaiki urutan perintah, lalu menulis sendiri
  program untuk memungut sampah di petak 4 dan 7. Misi gagal jika ada sampah yang
  tertinggal atau Bit memungut di petak kosong.
- **Level 2, Catatan Cahaya Kelas.** Bit mengukur cahaya dua kelas dengan
  `cek_cahaya()`, menyimpannya ke variabel, lalu melaporkan hasilnya dengan
  `printf`. Tebakannya menguji pemahaman `total = total + cek_cahaya();`. Misi
  perbaikan berisi kesalahan urutan operasi (`a + b / 2`), dan misi tulis sendiri
  diuji juga dengan nilai cahaya lain sehingga angka yang ditulis langsung tidak lolos.

Setiap level adalah satu unit microlearning (sekitar 6 sampai 8 menit, satu
konsep) dan mengikuti lima fase guided inquiry menurut Pedaste dkk. (2015):

| Fase | Yang dilakukan siswa di dalam game | Peran guru |
|---|---|---|
| 1. Orientasi | Membaca cerita tokoh sekolah dan misi level | Membuka pembelajaran |
| 2. Konseptualisasi | Menebak hasil kode C sebelum dijalankan (tombol jalankan dikunci) dan menulis alasannya di LKPD | Memantau tebakan di dasbor |
| 3. Investigasi | Menjalankan kode langkah demi langkah, mengubah nilai, mengamati panel eksekusi, lalu menjawab pertanyaan pengamatan di LKPD | Memberi pertanyaan pancingan |
| 4. Kesimpulan | Membandingkan tebakan dengan hasil, memperbaiki kode, menulis kode sendiri dari awal, lalu merumuskan aturan | Memeriksa temuan dan kode siswa di dasbor |
| 5. Diskusi | Menjawab pertanyaan refleksi di LKPD lalu mengirim LKPD ke guru | Memimpin refleksi kelas |

Fase kesimpulan terdiri dari empat tahap:

1. **Bandingkan tebakan** dengan hasil nyata.
2. **Perbaiki kode** Bit yang keliru. Jika gagal dua kali, game menawarkan
   sublevel latihan yang lebih sederhana (scaffolding).
3. **Tulis kode sendiri**. Papan tulis hampir kosong, siswa menulis program C
   dari awal untuk misi baru. Tersedia dua petunjuk bertahap dan kerangka kode
   untuk siswa yang masih kesulitan. Kode diperiksa pada peta utama dan peta
   variasi, sehingga kode yang hanya cocok untuk satu peta (hardcode) tidak lolos.
   Beberapa misi juga mensyaratkan struktur tertentu, misalnya wajib memakai `for`.
4. **Rumuskan aturan** konsep dengan memilih pernyataan yang tepat dan menulis
   temuan dengan kalimat sendiri.

Visualisasi eksekusi kode terdiri dari dua lapis:
1. Dunia game: Bit bergerak, menyiram, menyalakan lampu, mengantar buku, dan
   memungut sampah sesuai kode.
2. Catatan eksekusi, dua kolom:
   - **Penjelasan langkah** (kiri): daftar semua langkah yang sudah dijalankan,
     berurutan seperti tabel telusur. Langkah yang sedang terjadi selalu di paling
     bawah dan ditampilkan lengkap: nomor dan isi baris, perhitungan ruas kanan
     penugasan (misalnya `total + cek_cahaya() → 30 + 70 → total = 100`) atau
     hasil kondisi (misalnya `kelembapan < 40 → 35 < 40 → benar (1)`), lalu
     penjelasannya. Langkah sebelumnya diringkas satu baris.
   - **Isi memori** (kanan): tabel variabel (tipe, nama, nilai), penghitung
     putaran, dan keluaran `printf`. Bagian ini hanya muncul jika konsepnya
     dipakai di kode, jadi level dasar tidak penuh kotak kosong.

Catatan eksekusi muncul saat kode bisa dijalankan. Di fase orientasi dan menebak
tempatnya dipakai untuk dunia game yang lebih besar. Saat fase kesimpulan tahap
**Bandingkan tebakan**, dunia game dan catatan eksekusi langsung menampilkan hasil
akhir kode percobaan beserta semua langkahnya.

## Akun guru dan siswa

- **Siswa** mendaftar sendiri di halaman awal (tab **Daftar siswa**) dengan nama,
  username, kata sandi, dan **kode kelas** dari guru. Progres dan LKPD tersimpan di
  server, jadi siswa bisa melanjutkan dari komputer mana pun.
- **Guru** hanya bisa mendaftar dengan **kode pendaftaran guru** dari pengelola
  server (variabel `KODE_DAFTAR_GURU`), atau dibuatkan lewat `python kelola.py buat-guru`.
  Siswa tidak bisa membuka dasbor guru, dan setiap guru hanya melihat kelasnya sendiri.
- Guru membuat kelas di dasbor. Setiap kelas punya kode (misalnya `VEE-D7N`) yang bisa
  ditampilkan besar di proyektor, diganti, dan pendaftarannya bisa dibuka atau ditutup.
- Siswa yang lupa kata sandi di-reset oleh guru. Siswa mendapat kata sandi sementara
  dan langsung diminta membuat kata sandi baru.
- Guru bisa menekan **Coba game** untuk memainkan semua level tanpa menyimpan progres.
- Jika server tidak terhubung (misalnya versi satu halaman), game tetap bisa dimainkan
  sebagai tamu tanpa akun. Progres hanya tersimpan selama halaman terbuka.

## LKPD (Lembar Kerja Peserta Didik)

Setiap level punya satu LKPD yang disusun mengikuti lima fase guided inquiry. LKPD
terisi otomatis dari jawaban siswa selama bermain, jadi siswa tidak mengerjakan
lembar terpisah:

| Bagian LKPD | Diisi di fase | Isi |
|---|---|---|
| Tujuan dan petunjuk | Orientasi | Misi level dan indikator computational thinking |
| 1. Membuat dugaan | Konseptualisasi | Pilihan tebakan dan **alasan** (wajib, minimal 3 kata) |
| 2. Mengamati eksekusi kode | Investigasi | Jawaban **tiga pertanyaan pengamatan**, ditampilkan satu per satu (wajib, minimal 2 kata) |
| 3. Kesimpulan | Kesimpulan | Kesesuaian dugaan, hasil misi perbaikan, kode tulisan sendiri, aturan yang dipilih, dan temuan dengan kalimat sendiri |
| 4. Refleksi | Diskusi | Jawaban **pertanyaan refleksi** untuk diskusi kelas (wajib, minimal 3 kata) |

- Siswa bisa membuka LKPD level yang sedang dimainkan lewat tombol **LKPD** di samping
  tahapan fase, lalu mencetaknya atau menyimpannya sebagai PDF.
- Guru membaca LKPD setiap siswa di dasbor (tab **LKPD** atau profil siswa), mencetak
  LKPD satu siswa atau semua siswa per level, dan mencetak **LKPD kosong** sebagai
  cadangan jika kelas tidak memakai komputer. Hasil cetak berukuran A4 dengan kolom
  catatan dan paraf guru.

## Dasbor guru

- **Panel kelas**: kode kelas, jumlah siswa terdaftar, siswa yang aktif sekarang,
  rata-rata level selesai, dan jumlah siswa yang perlu didampingi.
- **Ringkasan kelas**: daftar siswa yang perlu didampingi beserta alasannya (misi
  perbaikan gagal berkali-kali, kode tulisan sendiri gagal, salah merumuskan aturan,
  sering mendapat galat kode, atau terlalu lama di satu fase), lalu kartu per level:
  jumlah selesai, tebakan yang sesuai, rata-rata waktu, tingkat bantuan (mandiri,
  dengan petunjuk, dengan kerangka atau sublevel), tebakan keliru terbanyak, dan
  galat kode yang paling sering muncul.
- **Siswa**: tabel semua siswa dengan status setiap level, waktu belajar, dan
  aktivitas terakhir. Profil siswa berisi waktu aktif di setiap fase, galat kode
  terakhir (baris, pesan, dan waktunya), jumlah menjalankan kode dan menekan
  Langkah, petunjuk yang dibuka, kode yang ditulis, LKPD, serta tombol reset kata
  sandi, ubah nama, pindah kelas, dan hapus akun.
- **Unduh data (CSV)**: satu baris per siswa per level berisi semua angka di atas
  dan isi LKPD, untuk diolah di Excel atau Google Sheets (pemisah titik koma).

Waktu belajar yang dicatat hanya waktu aktif: tab game terlihat dan ada gerakan
mouse atau ketikan dalam 2 menit terakhir.

## Tata letak layar bermain

Di layar laptop dan PC (lebar minimal 1200 piksel), layar bermain muat satu
layar tanpa menggulir halaman. Bilah atas dibuat ramping, lalu judul level dan
lima fase berada dalam satu baris. Di bawahnya ada tiga kolom:

| Kolom kiri | Kolom tengah | Kolom kanan |
|---|---|---|
| Kartu fase (cerita, tebakan, pemandu, misi) | Papan kode + tombol Langkah, Jalankan, Ulang | Dunia game di atas, catatan eksekusi di bawah |

- Isi yang panjang bergulir di dalam kotaknya sendiri (kartu fase, papan kode,
  penjelasan langkah). Tombol utama kartu fase selalu terlihat di bagian bawah kartu.
- Tahap fase kesimpulan ditampilkan ringkas (empat kotak bernomor dan nama tahap
  yang aktif). Jika tebakan sesuai hasil, tebakan dan hasil pengamatan digabung
  dalam satu kotak.
- Papan kode otomatis menggulir ke baris yang sedang dijalankan dan ke baris
  tempat kursor berada. Pada layar pendek ukuran huruf kode sedikit dikecilkan.
- Ukuran dunia game menyesuaikan tinggi layar. Catatan eksekusi mendapat paling
  sedikit 46% tinggi kolom kanan, sisanya untuk dunia game.
- Diuji pada ukuran jendela browser 1280x600, 1366x657 (laptop 1366x768 dengan
  bilah browser), 1440x789, dan 1920x950. Di layar yang lebih kecil (tablet dan
  ponsel) bagian-bagiannya ditumpuk dan halaman bisa digulir.

## Tampilan

- Font pixel: Pixelify Sans untuk judul dan tombol, DotGothic16 untuk teks dan kode.
- Latar langit beranimasi (awan, burung, matahari, bukit, gedung sekolah, bendera
  Merah Putih, kelopak bunga).
- Dunia game beranimasi: kupu-kupu dan bunga bergoyang di taman, cahaya jendela
  dan debu di kelas, kilau di perpustakaan, kucing tidur, tokoh NPC yang
  melompat senang saat misi berhasil.
- Bingkai UI pixel art (kertas, kayu, papan tulis) dan perayaan konfeti.
- Animasi otomatis dimatikan jika perangkat meminta gerak dikurangi
  (`prefers-reduced-motion`).

## Papan kode

- Strip **Isi bit.h** selalu tampil di bagian atas papan kode. Siswa bisa
  mengarahkan kursor untuk membaca penjelasan perintah (muncul sebagai tip melayang,
  jadi tidak memakan tempat papan), atau mengklik perintah untuk menyisipkannya
  ke kode (hanya saat papan bisa ditulis). Perintah sensor ditampilkan bersama
  contoh variabelnya, misalnya `int kelembapan = cek_kelembapan();`.
- Template misi tulis sendiri juga diawali komentar berisi daftar isi bit.h.
- Lapisan warna kode dan area ketik berada di satu wadah gulir, dan ligatur font
  dimatikan, sehingga kursor selalu sejajar dengan huruf.

## Musik dan pengaturan

- Musik latar: **Baroque Coffee House** oleh Doug Maxwell / Media Right Productions
  (file `frontend/public/musik/baroque-coffee-house.mp3`, 128 kbps).
- Lagu mulai setelah klik atau tombol keyboard pertama (aturan browser), diputar
  berulang, dan berhenti sementara saat tab tidak dilihat.
- Tombol not balok di bilah atas menyalakan atau mematikan musik. Tombol roda gigi
  membuka panel **Pengaturan** (musik nyala/mati dan volume). Pengaturan disimpan
  di browser.
- Untuk mengganti lagu, timpa file mp3 dengan nama yang sama, lalu ubah judul dan
  pencipta di `frontend/src/data/musik.js`.

## Teknologi

- Frontend: React 18 + Vite (folder `frontend`)
- Backend: FastAPI + SQLAlchemy, dengan SQLite (server lokal) atau PostgreSQL (online)
  (folder `backend`)
- Aset: sprite pixel art buatan sendiri (folder `frontend/src/assets/sprites`)

## Cara menjalankan dan deploy

Panduan lengkap ada di **[DEPLOY.md](DEPLOY.md)**:

- **Online gratis** dengan Render (server) dan Neon (basis data PostgreSQL).
- **Server di laptop guru** untuk lab sekolah tanpa internet (SQLite).
- **Mode pengembangan** dengan dua terminal.

Ringkasnya, untuk mencoba di komputer sendiri:

```bash
cd frontend && npm install && npm run build
cd ../backend && pip install -r requirements.txt
copy env.contoh .env        # isi KODE_DAFTAR_GURU
uvicorn main:app --host 0.0.0.0 --port 8000
```

Lalu buka http://localhost:8000.

### Versi satu halaman

```bash
cd frontend
npx vite build -c vite.artifact.config.js
node ../tools/bangun_artifact.mjs
```

Hasilnya `artifact/jejak-kode.html`, bisa dibuka tanpa backend. Letakkan folder
`musik` (salinan dari `frontend/public/musik`) di sebelah file HTML tersebut
supaya lagunya ikut terputar.

## Struktur folder

```
frontend/
  src/engine/interpreter.js   interpreter subset bahasa C, berjalan per pernyataan
  src/engine/runner.js        penjalan langkah demi langkah dan jalankan semua
  src/engine/dunia.js         model dunia game (peta, Bit, objek misi, perintah bit.h)
  src/game/levels.js          data level: cerita, kode, tebakan, misi, sublevel, tulis sendiri, aturan
  src/game/periksa.js         pemeriksa misi tulis sendiri (peta utama, syarat, peta variasi)
  src/game/langit.js          gambar latar pixel art (langit, awan, sekolah, bendera)
  src/components/             papan kode, panel eksekusi, kanvas dunia, latar animasi, pengaturan
  src/data/musik.js           pemutar musik latar dan penyimpanan pengaturan
  public/musik/               file lagu
  src/screens/                layar mulai, peta sekolah, bermain, dasbor guru
  tests/uji_engine.mjs        uji otomatis interpreter dan semua level
  src/data/store.js           keadaan game, akun, dan penyimpanan progres ke server
  src/components/Akun.jsx     form akun (ganti kata sandi, masuk lagi saat sesi habis)
  src/components/LembarKerja.jsx  LKPD per level (tampil, cetak, LKPD kosong)
  src/screens/dasbor/         bagian dasbor guru: ringkasan, siswa, LKPD, olah data dan CSV
backend/
  main.py                     API akun, kelas, progres, dan dasbor guru
  basisdata.py                tabel dan koneksi (SQLite atau PostgreSQL lewat DATABASE_URL)
  keamanan.py                 hash kata sandi, token sesi, kode kelas, pembatas percobaan
  kelola.py                   perintah terminal: buat akun guru, reset sandi, daftar akun
  env.contoh                  contoh pengaturan server (salin menjadi .env)
  test_api.py                 uji API (bisa dijalankan dengan SQLite atau PostgreSQL)
Dockerfile, render.yaml       paket deploy untuk Render
DEPLOY.md                     panduan deploy
tools/
  buat_aset.py                pembuat sprite dan bingkai UI pixel art
  pratinjau_aset.png          pratinjau semua sprite
  bangun_artifact.mjs         penyusun versi satu halaman
```

## Mengubah konten

- **Menambah level**: salin satu objek di `frontend/src/game/levels.js`, lalu isi
  `bab` dengan salah satu nama di `BAB` (Dasar, Percabangan, Perulangan). Peta ditulis
  sebagai baris teks (kode huruf petak ada di `UBIN` dalam `dunia.js`). Jalankan
  `npm run uji` untuk memastikan kunci tebakan, kode rusak, solusi perbaikan, dan
  solusi tulis sendiri sudah sesuai. Bila misi tulis sendiri memakai peta variasi,
  `saranVarian` bisa diisi pesan saran khusus saat kode gagal di peta variasi.
- **Data uji coba versi lama**: tabel `siswa` dan `progres` dari versi tanpa akun
  tidak dipakai lagi. Data baru disimpan di tabel `pengguna`, `kelas`, `sesi`, dan
  `progres_level`.
- **Mengganti gambar**: timpa file PNG di `frontend/src/assets/sprites` dengan nama
  dan ukuran yang sama, atau ubah gambar di `tools/buat_aset.py` lalu jalankan
  `python tools/buat_aset.py`.

## Perintah Bit (`bit.h`)

```c
void maju();              // maju satu petak
void siram();             // menyiram pot di petak Bit
int  cek_kelembapan();    // kelembapan tanah pot (0 sampai 100)
void nyalakan_lampu();
void matikan_lampu();
int  cek_cahaya();        // cahaya ruangan (0 sampai 100)
void ambil_buku();
void taruh_buku();
int  ada_sampah();        // 1 jika ada sampah di petak Bit, 0 jika tidak
void pungut();
```

Setiap level hanya membuka perintah yang dibutuhkan. Selain itu tersedia `printf`
dari `stdio.h`.

Interpreter mendukung `int main()`, tipe `int`, `float`, `double`, `char`,
operator aritmetika, `+=`, `-=`, `++`, `--`, perbandingan, `&&`, `||`, `!`,
`if`/`else if`/`else`, `for`, `while`, `do-while`, `break`, `continue`, `return`,
dan `printf` dengan `%d`, `%f`, `%.2f`, `%c`, `%s`. Kondisi bernilai 1 (benar)
atau 0 (salah) seperti di C. Pesan kesalahan ditulis dalam bahasa Indonesia dan
menunjuk nomor baris, misalnya "Kurang titik koma (;) di akhir perintah."

## Catatan prototipe

- Bahasa C di dalam game adalah subset untuk pemula (belum ada array, pointer,
  fungsi buatan sendiri, dan `scanf`).
- Satu akun guru bisa punya banyak kelas, tetapi satu kelas hanya dikelola satu guru.
