// Data level. Setiap level adalah satu unit microlearning (± 6-8 menit, satu konsep)
// dan disusun mengikuti lima fase guided inquiry (Pedaste dkk., 2015):
// orientasi, konseptualisasi, investigasi, kesimpulan, diskusi.
// Bahasa yang dipelajari: C.

import { CONTOH_PAKAI } from '../engine/dunia.js';

export const FASE = [
  { id: 'orientasi', nama: 'Orientasi', ringkas: 'Baca cerita dan misi' },
  { id: 'konseptualisasi', nama: 'Konseptualisasi', ringkas: 'Tebak hasil kode' },
  { id: 'investigasi', nama: 'Investigasi', ringkas: 'Jalankan dan amati' },
  { id: 'kesimpulan', nama: 'Kesimpulan', ringkas: 'Perbaiki dan tulis kode' },
  { id: 'diskusi', nama: 'Diskusi', ringkas: 'Kirim temuan dan refleksi' },
];

// Urutan bab. Bab dasar dikerjakan sebelum percabangan dan perulangan.
export const BAB = [
  { nama: 'Dasar', ket: 'Urutan perintah, variabel, dan printf' },
  { nama: 'Percabangan', ket: 'Bit mengambil keputusan dengan if dan if-else' },
  { nama: 'Perulangan', ket: 'Bit mengulang perintah dengan for' },
];

export const TOKOH = {
  darto: { nama: 'Pak Darto', peran: 'Penjaga sekolah', potret: 'potret_darto', badan: 'npc_darto' },
  nara: { nama: 'Nara', peran: 'Ketua kelas X PPLG 1', potret: 'potret_nara', badan: 'npc_nara' },
  sari: { nama: 'Bu Sari', peran: 'Guru pemrograman', potret: 'potret_sari', badan: 'npc_sari' },
};

// kerangka program C yang sama di semua level
const C = (isi) => `#include <stdio.h>\n#include "bit.h"\n\nint main() {\n${isi}\n    return 0;\n}\n`;
const kosong = (komentar) => C(`${komentar.map((k) => `    // ${k}`).join('\n')}\n`);

// --------------------------------------------------------------- peta
const TAMAN = [
  'FFFFFFFFFF',
  '"S""""S"""',
  '::::::::::',
  'S""""""""S',
  '""""""""""',
];
const KELAS = [
  'WJWWPWWJCW',
  '.D.D..D.D.',
  '..........',
  '.D.D..D.D.',
  '..........',
];
const LORONG = [
  'WLLWJWLLMW',
  ',,,,,,,,,,',
  ',,,,,,,,,,',
  ',T,,,,,,T,',
  ',,,,,,,,,,',
];
const perpus = (xRak) => [
  'WMWJWWJWCW',
  '.R.R..R.R.',
  '..........'.slice(0, xRak) + 'R' + '..........'.slice(xRak + 1),
  '.D....D...',
  '..........',
];

// --------------------------------------------------------------- pemeriksa misi
// Level dasar 1: semua sampah terpungut dan Bit tidak memungut di petak kosong.
const sampahTerpungut = (h) => {
  if (h.galat) return { berhasil: false, pesan: h.galat.pesan };
  const sisa = h.dunia.sampah.filter((s) => s.ada);
  if (sisa.length) {
    return { berhasil: false, pesan: `Masih ada ${sisa.length} sampah di petak ${sisa.map((s) => s.x).join(' dan ')}.` };
  }
  const kosong = h.dunia.peringatan.filter((p) => p.startsWith('Tidak ada sampah')).length;
  if (kosong) {
    return { berhasil: false, pesan: `Semua sampah terpungut, tetapi Bit ${kosong} kali memungut di petak kosong. Pungut hanya di petak yang ada sampahnya supaya baterai Bit hemat.` };
  }
  return { berhasil: true, pesan: 'Semua sampah terpungut dan Bit tidak membuang tenaga di petak kosong.' };
};

// Level dasar 2: printf menampilkan rata-rata cahaya semua saklar di peta.
const angkaDesimalTerakhir = (teks) => {
  const a = (teks || '').match(/-?\d+(?:\.\d+)?/g);
  return a ? Number(a[a.length - 1]) : null;
};
const laporanRata = (h) => {
  if (h.galat) return { berhasil: false, pesan: h.galat.pesan };
  const nilai = h.dunia.saklar.map((s) => s.cahaya);
  const jumlah = nilai.reduce((a, b) => a + b, 0);
  const target = Math.trunc(jumlah / nilai.length);
  const lapor = angkaDesimalTerakhir(h.output);
  if (lapor === null) return { berhasil: false, pesan: 'Bit belum melaporkan apa pun. Tampilkan hasilnya dengan printf("%d\\n", rata);' };
  const tepat = Math.abs(lapor - target) < 1e-9 || Math.abs(lapor - jumlah / nilai.length) < 0.01;
  if (!tepat) {
    return { berhasil: false, pesan: `Bit melaporkan ${lapor}, padahal rata-rata cahayanya (${nilai.join(' + ')}) / ${nilai.length} = ${target}.` };
  }
  return { berhasil: true, pesan: `Laporannya tepat: rata-rata cahaya ${target}.` };
};

const potTepat = (h) => {
  if (h.galat) return { berhasil: false, pesan: h.galat.pesan };
  const kering = h.dunia.tanaman.filter((t) => t.status === 'kering').length;
  const banjir = h.dunia.tanaman.filter((t) => t.status === 'banjir').length;
  if (banjir) return { berhasil: false, pesan: `${banjir} pot kebanyakan air. Pot yang sudah lembap tidak boleh disiram.` };
  if (kering) return { berhasil: false, pesan: `${kering} pot masih kering. Pot dengan kelembapan di bawah 40 harus disiram.` };
  return { berhasil: true, pesan: 'Semua pot kering sudah disiram dan tidak ada pot yang kebanjiran.' };
};

const lampuTepat = (h) => {
  if (h.galat) return { berhasil: false, pesan: h.galat.pesan };
  const salah = h.dunia.saklar.filter((s) => (s.cahaya < 50) !== s.nyala);
  if (salah.length) {
    const s = salah[0];
    return {
      berhasil: false,
      pesan: s.cahaya < 50
        ? `Ruang ${s.nama} masih gelap (cahaya ${s.cahaya}) tetapi lampunya mati.`
        : `Ruang ${s.nama} sudah terang (cahaya ${s.cahaya}) tetapi lampunya masih menyala.`,
    };
  }
  return { berhasil: true, pesan: 'Ruang yang gelap lampunya menyala, ruang yang terang lampunya mati. Listrik jadi hemat.' };
};

const bukuDiRak = (h) => {
  if (h.galat) return { berhasil: false, pesan: h.galat.pesan };
  if (h.dunia.bukuJatuh.length) return { berhasil: false, pesan: 'Buku jatuh ke lantai sebelum Bit sampai di depan rak.' };
  if (!h.dunia.rak.some((r) => r.isi > 0)) return { berhasil: false, pesan: 'Buku belum sampai di rak.' };
  return { berhasil: true, pesan: 'Buku tersusun rapi di rak.' };
};

const angkaTerakhir = (teks) => {
  const a = (teks || '').match(/-?\d+/g);
  return a ? Number(a[a.length - 1]) : null;
};

const lorongBersih = (h) => {
  if (h.galat) return { berhasil: false, pesan: h.galat.pesan };
  const target = h.dunia.sampah.length;
  const sisa = h.dunia.sampah.filter((s) => s.ada).length;
  if (sisa) return { berhasil: false, pesan: `Masih ada ${sisa} sampah di lorong.` };
  const lapor = angkaTerakhir(h.output);
  if (lapor === null) return { berhasil: false, pesan: 'Bit belum melaporkan jumlah sampah. Tampilkan dengan printf("%d\\n", jumlah);' };
  if (lapor !== target) return { berhasil: false, pesan: `Bit melaporkan ${lapor} sampah, padahal yang dipungut ${target}.` };
  return { berhasil: true, pesan: `Lorong bersih dan laporannya tepat: ${target} sampah.` };
};

const hitung = (kode, pola) => (kode.replace(/\/\/.*$/gm, '').match(pola) || []).length;

// --------------------------------------------------------------- level
export const LEVEL = [
  // ============================================================ BAB DASAR
  {
    id: 'L1',
    nomor: 1,
    bab: 'Dasar',
    judul: 'Hari Pertama Bit',
    konsep: 'Urutan perintah',
    ct: 'Algoritma: menyusun langkah-langkah dengan urutan yang tepat.',
    durasi: '± 6 menit',
    tokoh: 'sari',
    tempat: 'Lorong kelas X',
    suasana: 'lorong',
    perintah: ['maju', 'pungut'],
    orientasi: {
      dialog: [
        'Selamat pagi! Kenalkan, ini Bit, robot piket baru di sekolah kita. Bit hanya bisa bekerja kalau diberi program.',
        'Program Bit ditulis dalam bahasa C. Semua perintah ditaruh di dalam int main() { ... }, satu perintah per baris, dan setiap perintah diakhiri titik koma (;).',
        'Tugas pertama Bit adalah membersihkan lorong kelas X sebelum bel masuk. Coba pelajari bagaimana Bit menjalankan perintah satu per satu.',
      ],
      misi: 'Pahami urutan Bit menjalankan perintah, lalu susun perintah yang tepat supaya semua sampah di lorong terpungut.',
    },
    percobaan: {
      peta: { ubin: LORONG, bit: { x: 1, y: 2 }, sampah: [{ x: 3, y: 2 }, { x: 5, y: 2 }] },
      kode: C('    maju();\n    maju();\n    pungut();\n    maju();\n    pungut();'),
    },
    tebakan: {
      pertanyaan: 'Ada sampah di petak 3 dan petak 5. Sebelum dijalankan, tebak dulu: berapa sampah yang berhasil dipungut Bit?',
      pilihan: [
        { id: 'a', teks: '2 sampah, karena ada dua perintah pungut();.' },
        { id: 'b', teks: '1 sampah, karena pungut(); yang kedua dijalankan saat Bit masih di petak 4.' },
        { id: 'c', teks: '0 sampah, karena pungut(); harus ditulis sebelum maju();.' },
      ],
      benar: 'b',
      hasilNyata: (h) => {
        const n = h.dunia.dipungut;
        return n === 1 ? 'b' : n === 2 ? 'a' : 'c';
      },
      penjelasan: 'Perintah di dalam main() dijalankan satu per satu dari atas ke bawah. Bit mulai di petak 1. Dua kali maju(); membawa Bit ke petak 3, lalu pungut(); memungut sampah di sana. Setelah satu maju(); lagi, Bit berada di petak 4, padahal sampah kedua ada di petak 5. Jadi pungut(); yang kedua tidak menemukan sampah. Bit mengerjakan perintah persis sesuai urutan yang ditulis.',
    },
    investigasi: {
      pemandu: [
        'Tekan Langkah satu per satu. Perhatikan angka petak Bit di penggaris bawah setiap kali maju(); dijalankan.',
        'Saat pungut(); yang kedua dijalankan, Bit ada di petak berapa? Tambahkan satu maju(); di tempat yang tepat, lalu jalankan lagi.',
        'Hapus satu titik koma (;), lalu jalankan. Baca pesan di catatan eksekusi, kemudian kembalikan titik komanya.',
      ],
    },
    perbaikan: {
      cerita: 'Bel masuk sebentar lagi. Ada sampah di petak 2, 3, dan 6. Urutan perintah Bit tertukar, sehingga ada sampah yang terlewat dan Bit memungut di petak kosong. Perbaiki urutannya.',
      peta: { ubin: LORONG, bit: { x: 1, y: 2 }, sampah: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 6, y: 2 }] },
      kode: C('    maju();\n    pungut();\n    pungut();\n    maju();\n    maju();\n    maju();\n    maju();\n    pungut();'),
      solusi: C('    maju();\n    pungut();\n    maju();\n    pungut();\n    maju();\n    maju();\n    maju();\n    pungut();'),
      cek: sampahTerpungut,
    },
    sublevel: {
      cerita: 'Latihan lebih sederhana: hanya ada satu sampah di petak 3. Isi bagian ___ dengan perintah yang tepat.',
      petunjuk: 'Bit mulai di petak 1. Untuk sampai di petak 3, Bit perlu maju(); dua kali, baru setelah itu pungut();.',
      peta: { ubin: LORONG, bit: { x: 1, y: 2 }, sampah: [{ x: 3, y: 2 }] },
      kode: C('    maju();\n    ___;\n    pungut();'),
      solusi: C('    maju();\n    maju();\n    pungut();'),
      cek: sampahTerpungut,
    },
    tulis: {
      cerita: 'Jam istirahat selesai dan ada sampah baru di petak 4 dan petak 7. Tulis programmu sendiri dari awal supaya Bit memungut keduanya tanpa memungut di petak kosong.',
      peta: { ubin: LORONG, bit: { x: 1, y: 2 }, sampah: [{ x: 4, y: 2 }, { x: 7, y: 2 }] },
      varian: [],
      kode: kosong(['Bit ada di petak 1. Sampah ada di petak 4 dan 7.', 'Tulis satu perintah per baris dan akhiri dengan titik koma (;).']),
      petunjuk: [
        'Hitung dulu jaraknya. Dari petak 1 ke petak 4 perlu tiga kali maju();. Setelah sampai, baru pungut();.',
        'Dari petak 4 ke petak 7 juga perlu tiga kali maju();. Urutannya: tiga kali maju();, pungut();, tiga kali maju();, lalu pungut(); lagi.',
      ],
      kerangka: C('    maju();\n    maju();\n    ___;\n    pungut();\n\n    maju();\n    ___;\n    ___;\n    ___;'),
      solusi: C('    maju();\n    maju();\n    maju();\n    pungut();\n    maju();\n    maju();\n    maju();\n    pungut();'),
      cek: sampahTerpungut,
    },
    aturan: {
      pertanyaan: 'Pernyataan mana yang sesuai dengan temuanmu?',
      pilihan: [
        { id: 'a', teks: 'Perintah di dalam main() dijalankan satu per satu dari atas ke bawah, jadi urutan penulisannya menentukan hasil.' },
        { id: 'b', teks: 'Semua perintah dijalankan bersamaan, jadi urutan penulisannya tidak penting.' },
        { id: 'c', teks: 'Bit otomatis berjalan ke petak yang ada sampahnya sebelum menjalankan pungut();.' },
      ],
      benar: 'a',
      petunjukSalah: 'Ingat percobaan tadi. Saat pungut(); yang kedua dijalankan, apakah Bit pindah sendiri ke petak 5?',
    },
    diskusi: [
      'Apa yang terjadi kalau urutan maju(); dan pungut(); ditukar? Sebutkan satu kegiatan sehari-hari yang urutannya tidak boleh tertukar.',
      'Mengapa setiap perintah di bahasa C diakhiri titik koma (;)?',
    ],
  },

  {
    id: 'L2',
    nomor: 2,
    bab: 'Dasar',
    judul: 'Catatan Cahaya Kelas',
    konsep: 'Variabel dan printf',
    ct: 'Abstraksi: menyimpan data yang penting ke dalam variabel, lalu mengolahnya.',
    durasi: '± 7 menit',
    tokoh: 'nara',
    tempat: 'Lorong kelas X',
    suasana: 'lorong',
    perintah: ['maju', 'cek_cahaya'],
    orientasi: {
      dialog: [
        'Hai, aku Nara, ketua kelas X PPLG 1. Kelas kita mau ikut lomba kelas hemat listrik.',
        'Sebelum mengatur lampu, kita butuh data. Bit bisa mengukur cahaya ruangan dengan cek_cahaya(), hasilnya berupa angka 0 sampai 100.',
        'Angka itu perlu disimpan supaya bisa diolah. Di bahasa C, tempat menyimpan nilai disebut variabel. Ayo lihat cara kerjanya.',
      ],
      misi: 'Pahami cara variabel menyimpan dan mengubah nilai, lalu bantu Bit melaporkan data cahaya dengan printf.',
    },
    percobaan: {
      peta: {
        ubin: LORONG,
        bit: { x: 1, y: 2 },
        saklar: [
          { x: 2, y: 2, cahaya: 30, nyala: false, nama: 'kelas X PPLG 1' },
          { x: 5, y: 2, cahaya: 70, nyala: false, nama: 'kelas X PPLG 2' },
        ],
      },
      kode: C('    int total = 0;\n    maju();\n    total = total + cek_cahaya();\n    maju();\n    maju();\n    maju();\n    total = total + cek_cahaya();\n    printf("%d\\n", total);'),
    },
    tebakan: {
      pertanyaan: 'Cahaya kelas X PPLG 1 adalah 30 dan kelas X PPLG 2 adalah 70. Angka berapa yang ditampilkan printf di akhir program?',
      pilihan: [
        { id: 'a', teks: '70, karena nilai total yang lama diganti hasil cek_cahaya() yang terakhir.' },
        { id: 'b', teks: '100, karena total = total + cek_cahaya(); menambahkan cahaya ke nilai total yang lama.' },
        { id: 'c', teks: '0, karena total sudah diisi 0 di baris pertama.' },
      ],
      benar: 'b',
      hasilNyata: (h) => {
        const n = angkaTerakhir(h.output);
        return n === 100 ? 'b' : n === 70 ? 'a' : 'c';
      },
      penjelasan: 'Variabel total bertipe int dibuat dengan nilai awal 0. Pada baris total = total + cek_cahaya();, ruas kanan dihitung dulu memakai nilai total yang lama, lalu hasilnya disimpan kembali ke total. Jadi total menjadi 0 + 30 = 30, lalu 30 + 70 = 100. printf("%d\\n", total); menampilkan isi total, yaitu 100. %d adalah tempat untuk angka bulat dan \\n berarti pindah baris.',
    },
    investigasi: {
      pemandu: [
        'Tekan Langkah satu per satu dan perhatikan tabel Variabel. Pada baris mana saja nilai total berubah?',
        'Lihat bagian perhitungan saat baris total = total + cek_cahaya(); dijalankan. Nilai total yang mana yang dipakai di ruas kanan?',
        'Ganti total = total + cek_cahaya(); yang kedua menjadi total = cek_cahaya();. Angka berapa yang ditampilkan sekarang?',
      ],
    },
    perbaikan: {
      cerita: 'Nara meminta laporan rata-rata cahaya dua kelas, yaitu jumlah cahaya keduanya dibagi 2. Laporan Bit ternyata salah. Perbaiki kodenya supaya angka yang ditampilkan benar.',
      peta: {
        ubin: LORONG,
        bit: { x: 1, y: 2 },
        saklar: [
          { x: 3, y: 2, cahaya: 40, nyala: false, nama: 'kelas X PPLG 3' },
          { x: 6, y: 2, cahaya: 80, nyala: false, nama: 'kelas X PPLG 4' },
        ],
      },
      kode: C('    int cahaya1;\n    int cahaya2;\n\n    maju();\n    maju();\n    cahaya1 = cek_cahaya();\n\n    maju();\n    maju();\n    maju();\n    cahaya2 = cek_cahaya();\n\n    int rata = cahaya1 + cahaya2 / 2;\n    printf("%d\\n", rata);'),
      solusi: C('    int cahaya1;\n    int cahaya2;\n\n    maju();\n    maju();\n    cahaya1 = cek_cahaya();\n\n    maju();\n    maju();\n    maju();\n    cahaya2 = cek_cahaya();\n\n    int rata = (cahaya1 + cahaya2) / 2;\n    printf("%d\\n", rata);'),
      cek: laporanRata,
    },
    sublevel: {
      cerita: 'Latihan lebih sederhana: dua kelas berdekatan. Bit sudah menjumlahkan cahaya keduanya ke variabel jumlah. Isi bagian ___ supaya rata-ratanya benar.',
      petunjuk: 'Jumlahkan dulu, baru bagi 2. Isi ___ dengan nama variabel yang menyimpan hasil penjumlahan. Bahasa C mengerjakan / lebih dulu daripada +, sama seperti kali dan bagi di matematika.',
      peta: {
        ubin: LORONG,
        bit: { x: 1, y: 2 },
        saklar: [
          { x: 2, y: 2, cahaya: 20, nyala: false, nama: 'kelas X PPLG 1' },
          { x: 4, y: 2, cahaya: 60, nyala: false, nama: 'kelas X PPLG 2' },
        ],
      },
      kode: C('    maju();\n    int a = cek_cahaya();\n    maju();\n    maju();\n    int b = cek_cahaya();\n    int jumlah = a + b;\n    int rata = ___ / 2;\n    printf("%d\\n", rata);'),
      solusi: C('    maju();\n    int a = cek_cahaya();\n    maju();\n    maju();\n    int b = cek_cahaya();\n    int jumlah = a + b;\n    int rata = jumlah / 2;\n    printf("%d\\n", rata);'),
      cek: laporanRata,
    },
    tulis: {
      cerita: 'Sekarang tulis programmu sendiri dari awal. Saklar kelas X PPLG 3 ada di petak 2 dan saklar kelas X PPLG 4 ada di petak 4. Ukur cahaya keduanya, simpan ke variabel, lalu tampilkan rata-ratanya dengan printf.',
      peta: {
        ubin: LORONG,
        bit: { x: 1, y: 2 },
        saklar: [
          { x: 2, y: 2, cahaya: 25, nyala: false, nama: 'kelas X PPLG 3' },
          { x: 4, y: 2, cahaya: 75, nyala: false, nama: 'kelas X PPLG 4' },
        ],
      },
      varian: [{
        ubin: LORONG,
        bit: { x: 1, y: 2 },
        saklar: [
          { x: 2, y: 2, cahaya: 90, nyala: false, nama: 'kelas X PPLG 3' },
          { x: 4, y: 2, cahaya: 40, nyala: false, nama: 'kelas X PPLG 4' },
        ],
      }],
      keteranganVarian: 'cahaya kedua kelas diganti',
      saranVarian: 'Pastikan angkanya berasal dari cek_cahaya() yang disimpan di variabel, bukan ditulis langsung.',
      kode: kosong(['Bit ada di petak 1. Saklar ada di petak 2 dan 4.', 'Simpan cahaya tiap kelas ke variabel, lalu tampilkan rata-ratanya.']),
      syarat: (k) => {
        if (hitung(k, /\bcek_cahaya\s*\(/g) < 2) return 'Ukur cahaya kedua kelas dengan cek_cahaya(), jangan menulis angkanya langsung.';
        if (hitung(k, /\b(?:int|float|double)\s+(?!main\b)[A-Za-z_]\w*/g) < 1) return 'Simpan hasil cek_cahaya() ke variabel, misalnya int a = cek_cahaya();';
        if (hitung(k, /\bprintf\s*\(/g) < 1) return 'Laporkan rata-ratanya dengan printf("%d\\n", rata);';
        return null;
      },
      petunjuk: [
        'Langkahnya: maju sampai di saklar pertama, simpan cek_cahaya() ke variabel, maju ke saklar kedua, simpan ke variabel lain, lalu hitung rata-ratanya.',
        'Contoh: int a = cek_cahaya(); lalu int b = cek_cahaya(); kemudian int rata = (a + b) / 2; dan printf("%d\\n", rata);. Jangan lupa tanda kurung pada (a + b).',
      ],
      kerangka: C('    maju();\n    int a = cek_cahaya();\n    ___;\n    ___;\n    int b = ___;\n    int rata = (___) / 2;\n    printf("%d\\n", ___);'),
      solusi: C('    maju();\n    int a = cek_cahaya();\n    maju();\n    maju();\n    int b = cek_cahaya();\n    int rata = (a + b) / 2;\n    printf("%d\\n", rata);'),
      cek: laporanRata,
    },
    aturan: {
      pertanyaan: 'Pernyataan mana yang sesuai dengan temuanmu?',
      pilihan: [
        { id: 'a', teks: 'Variabel menyimpan semua nilai yang pernah diisikan, jadi printf menampilkan semuanya.' },
        { id: 'b', teks: 'Tanda = di bahasa C berarti kedua ruas sudah sama besar, seperti di matematika.' },
        { id: 'c', teks: 'Variabel menyimpan satu nilai sesuai tipenya. Saat diisi dengan =, ruas kanan dihitung dulu, lalu hasilnya menggantikan nilai yang lama.' },
      ],
      benar: 'c',
      petunjukSalah: 'Lihat lagi tabel Variabel saat baris total = total + cek_cahaya(); dijalankan. Ke mana nilai total yang lama?',
    },
    diskusi: [
      'Mengapa hasil cek_cahaya() perlu disimpan ke variabel dulu sebelum dihitung?',
      'Apa beda tanda = di bahasa C dengan tanda = di matematika?',
    ],
  },

  // ============================================================ BAB PERCABANGAN
  {
    id: 'L3',
    nomor: 3,
    bab: 'Percabangan',
    judul: 'Tanaman di Taman Sekolah',
    konsep: 'Percabangan if',
    ct: 'Abstraksi: memilih informasi yang menentukan, yaitu nilai kelembapan.',
    durasi: '± 7 menit',
    tokoh: 'darto',
    tempat: 'Taman depan',
    suasana: 'taman',
    perintah: ['maju', 'siram', 'cek_kelembapan'],
    orientasi: {
      dialog: [
        'Selamat pagi! Mulai hari ini Bit, robot piket sekolah, membantu Bapak merawat taman.',
        'Tanaman hanya boleh disiram kalau tanahnya kering, yaitu kelembapannya di bawah 40. Kalau terlalu banyak air, akarnya bisa busuk.',
        'Sampai sekarang Bit selalu menjalankan semua perintah berurutan. Di taman, Bit harus bisa mengambil keputusan dulu. Caranya dengan if.',
      ],
      misi: 'Pahami kapan perintah di dalam blok if dijalankan, lalu bantu Bit menyiram pot yang kering saja.',
    },
    percobaan: {
      peta: { ubin: TAMAN, bit: { x: 2, y: 2 }, tanaman: [{ x: 2, y: 2, kelembapan: 35 }] },
      kode: C('    int kelembapan = 35;\n    if (kelembapan < 40) {\n        siram();\n    }\n    maju();'),
    },
    tebakan: {
      pertanyaan: 'Sebelum kodenya dijalankan, tebak dulu: apa yang akan dilakukan Bit pada pot ini?',
      pilihan: [
        { id: 'a', teks: 'Menyiram pot, karena kondisi 35 < 40 bernilai benar (1).' },
        { id: 'b', teks: 'Tidak menyiram pot, karena kondisi 35 < 40 bernilai salah (0).' },
        { id: 'c', teks: 'Menyiram pot, karena siram(); selalu dijalankan apa pun kondisinya.' },
      ],
      benar: 'a',
      hasilNyata: (h) => (h.dunia.tanaman[0].disiram > 0 ? 'a' : 'b'),
      penjelasan: 'Saat baris if dijalankan, kondisi kelembapan < 40 menjadi 35 < 40 yang bernilai benar (1). Di bahasa C, kondisi yang benar bernilai 1 dan yang salah bernilai 0. Karena benar, siram(); di dalam kurung kurawal if dijalankan. maju(); berada di luar kurung kurawal, jadi selalu dijalankan.',
    },
    investigasi: {
      pemandu: [
        'Tekan Langkah satu per satu. Lihat panel Kondisi saat baris if dijalankan.',
        'Ubah angka 35 menjadi 55, lalu jalankan lagi. Baris mana yang tidak lagi disorot?',
        'Apakah maju(); tetap dijalankan di kedua percobaan? Mengapa?',
      ],
    },
    perbaikan: {
      cerita: 'Sekarang Bit membaca kelembapan langsung dari pot dengan cek_kelembapan(). Ada dua pot di jalur taman: satu kering, satu sudah lembap. Kode di bawah ini membuat pot yang salah tersiram. Perbaiki kodenya.',
      peta: { ubin: TAMAN, bit: { x: 1, y: 2 }, tanaman: [{ x: 2, y: 2, kelembapan: 30 }, { x: 4, y: 2, kelembapan: 70 }] },
      kode: C('    int kelembapan;\n\n    maju();\n    kelembapan = cek_kelembapan();\n    if (kelembapan > 40) {\n        siram();\n    }\n\n    maju();\n    maju();\n    kelembapan = cek_kelembapan();\n    if (kelembapan > 40) {\n        siram();\n    }'),
      solusi: C('    int kelembapan;\n\n    maju();\n    kelembapan = cek_kelembapan();\n    if (kelembapan < 40) {\n        siram();\n    }\n\n    maju();\n    maju();\n    kelembapan = cek_kelembapan();\n    if (kelembapan < 40) {\n        siram();\n    }'),
      cek: potTepat,
    },
    sublevel: {
      cerita: 'Latihan lebih sederhana: hanya ada satu pot kering. Isi bagian ___ dengan simbol perbandingan yang tepat.',
      petunjuk: 'Pot disiram kalau kelembapannya di bawah 40. Simbol untuk "lebih kecil dari" adalah <.',
      peta: { ubin: TAMAN, bit: { x: 1, y: 2 }, tanaman: [{ x: 2, y: 2, kelembapan: 25 }] },
      kode: C('    maju();\n    int kelembapan = cek_kelembapan();\n    if (kelembapan ___ 40) {\n        siram();\n    }'),
      solusi: C('    maju();\n    int kelembapan = cek_kelembapan();\n    if (kelembapan < 40) {\n        siram();\n    }'),
      cek: potTepat,
    },
    tulis: {
      cerita: 'Pak Darto menaruh dua pot baru di petak 2 dan 3. Tulis programnya sendiri dari awal: Bit memeriksa setiap pot dan hanya menyiram pot yang kering.',
      peta: { ubin: TAMAN, bit: { x: 1, y: 2 }, tanaman: [{ x: 2, y: 2, kelembapan: 60 }, { x: 3, y: 2, kelembapan: 15 }] },
      varian: [{ ubin: TAMAN, bit: { x: 1, y: 2 }, tanaman: [{ x: 2, y: 2, kelembapan: 20 }, { x: 3, y: 2, kelembapan: 85 }] }],
      keteranganVarian: 'kelembapan kedua pot ditukar',
      kode: kosong(['Bit ada di petak 1. Pot ada di petak 2 dan 3.', 'Siram hanya pot yang kelembapannya di bawah 40.']),
      syarat: (k) => (hitung(k, /\bif\s*\(/g) < 1 ? 'Gunakan if supaya Bit memeriksa kelembapan dulu sebelum menyiram.' : null),
      petunjuk: [
        'Untuk setiap pot: maju();, baca kelembapan dengan cek_kelembapan(), lalu siram(); hanya jika nilainya di bawah 40.',
        'Simpan hasil cek ke variabel, misalnya int k = cek_kelembapan();, lalu tulis if (k < 40) { siram(); }. Ulangi untuk pot kedua.',
      ],
      kerangka: C('    int k;\n\n    maju();\n    k = cek_kelembapan();\n    if (k ___ 40) {\n        ___;\n    }\n\n    maju();\n    k = ___;\n    if (___) {\n        siram();\n    }'),
      solusi: C('    int k;\n    maju();\n    k = cek_kelembapan();\n    if (k < 40) {\n        siram();\n    }\n    maju();\n    k = cek_kelembapan();\n    if (k < 40) {\n        siram();\n    }'),
      cek: potTepat,
    },
    aturan: {
      pertanyaan: 'Pernyataan mana yang sesuai dengan temuanmu?',
      pilihan: [
        { id: 'a', teks: 'Perintah di dalam kurung kurawal { } milik if hanya dijalankan jika kondisinya bernilai benar (1).' },
        { id: 'b', teks: 'Perintah di dalam if selalu dijalankan, kondisinya hanya hiasan.' },
        { id: 'c', teks: 'Perintah setelah kurung kurawal penutup } hanya dijalankan jika kondisinya salah (0).' },
      ],
      benar: 'a',
      petunjukSalah: 'Coba ingat percobaanmu saat angka 35 diganti 55. Apakah siram(); tetap dijalankan?',
    },
    diskusi: [
      'Kapan isi blok if dilewati? Beri satu contoh dari kehidupan sekolah.',
      'Kenapa maju(); tetap dijalankan walaupun kondisinya salah (0)?',
    ],
  },

  {
    id: 'L4',
    nomor: 4,
    bab: 'Percabangan',
    judul: 'Lampu Kelas Hemat Listrik',
    konsep: 'Percabangan if-else',
    ct: 'Algoritma: menentukan tepat satu dari dua tindakan berdasarkan kondisi.',
    durasi: '± 7 menit',
    tokoh: 'nara',
    tempat: 'Ruang kelas X PPLG 1',
    suasana: 'kelas',
    perintah: ['maju', 'nyalakan_lampu', 'matikan_lampu', 'cek_cahaya'],
    orientasi: {
      dialog: [
        'Hai lagi! Data cahaya yang dicatat Bit sudah lengkap, dan lomba kelas hemat listrik resmi dimulai.',
        'Aturannya: kalau cahaya di ruangan kurang dari 50, lampu dinyalakan. Kalau cahayanya sudah cukup, lampu dimatikan.',
        'Bit akan mengurus saklarnya. Kita cek dulu bagaimana Bit memilih satu dari dua tindakan dengan if-else.',
      ],
      misi: 'Pahami cara if-else memilih blok yang dijalankan, lalu atur lampu beberapa ruang kelas dengan tepat.',
    },
    percobaan: {
      peta: { ubin: KELAS, bit: { x: 4, y: 2 }, saklar: [{ x: 4, y: 2, cahaya: 80, nyala: true, nama: 'kelas X PPLG 1' }] },
      kode: C('    int cahaya = 80;\n    if (cahaya < 50) {\n        nyalakan_lampu();\n    } else {\n        matikan_lampu();\n    }'),
    },
    tebakan: {
      pertanyaan: 'Lampu sekarang menyala. Setelah program selesai, bagaimana keadaan lampunya?',
      pilihan: [
        { id: 'a', teks: 'Menyala, karena nyalakan_lampu(); ditulis lebih dulu.' },
        { id: 'b', teks: 'Mati, karena 80 < 50 bernilai salah (0) sehingga blok else yang dijalankan.' },
        { id: 'c', teks: 'Menyala sebentar lalu mati, karena kedua blok dijalankan berurutan.' },
      ],
      benar: 'b',
      hasilNyata: (h) => (h.dunia.saklar[0].nyala ? 'a' : 'b'),
      penjelasan: 'Kondisi cahaya < 50 menjadi 80 < 50 yang bernilai salah (0). Isi blok if dilewati dan hanya isi blok else yang dijalankan, jadi lampu dimatikan. Baris nyalakan_lampu(); tidak pernah disorot.',
    },
    investigasi: {
      pemandu: [
        'Jalankan langkah demi langkah. Perhatikan baris mana saja yang disorot.',
        'Ubah cahaya menjadi 30, lalu jalankan lagi. Blok mana yang sekarang dijalankan?',
        'Pernahkah isi blok if dan isi blok else dijalankan dalam satu kali jalan?',
      ],
    },
    perbaikan: {
      tempat: 'Lorong kelas X',
      cerita: 'Bit sekarang bertugas di lorong dan membaca cahaya tiap kelas dengan cek_cahaya(). Kelas X PPLG 1 gelap, kelas X PPLG 2 terang. Kode di bawah membuat lampu kedua kelas salah. Perbaiki kodenya.',
      peta: {
        ubin: LORONG,
        bit: { x: 1, y: 2 },
        saklar: [
          { x: 2, y: 2, cahaya: 20, nyala: false, nama: 'kelas X PPLG 1' },
          { x: 5, y: 2, cahaya: 90, nyala: true, nama: 'kelas X PPLG 2' },
        ],
      },
      kode: C('    int cahaya;\n\n    maju();\n    cahaya = cek_cahaya();\n    if (cahaya < 50) {\n        matikan_lampu();\n    } else {\n        nyalakan_lampu();\n    }\n\n    maju();\n    maju();\n    maju();\n    cahaya = cek_cahaya();\n    if (cahaya < 50) {\n        matikan_lampu();\n    } else {\n        nyalakan_lampu();\n    }'),
      solusi: C('    int cahaya;\n\n    maju();\n    cahaya = cek_cahaya();\n    if (cahaya < 50) {\n        nyalakan_lampu();\n    } else {\n        matikan_lampu();\n    }\n\n    maju();\n    maju();\n    maju();\n    cahaya = cek_cahaya();\n    if (cahaya < 50) {\n        nyalakan_lampu();\n    } else {\n        matikan_lampu();\n    }'),
      cek: lampuTepat,
    },
    sublevel: {
      tempat: 'Lorong kelas X',
      cerita: 'Latihan lebih sederhana: satu kelas yang gelap. Isi bagian ___ dengan perintah yang tepat.',
      petunjuk: 'Isi blok if dijalankan saat cahaya < 50 bernilai benar (1), artinya ruangan gelap. Ruangan gelap perlu lampu yang menyala.',
      peta: { ubin: LORONG, bit: { x: 1, y: 2 }, saklar: [{ x: 2, y: 2, cahaya: 30, nyala: false, nama: 'kelas X PPLG 1' }] },
      kode: C('    maju();\n    int cahaya = cek_cahaya();\n    if (cahaya < 50) {\n        ___;\n    } else {\n        matikan_lampu();\n    }'),
      solusi: C('    maju();\n    int cahaya = cek_cahaya();\n    if (cahaya < 50) {\n        nyalakan_lampu();\n    } else {\n        matikan_lampu();\n    }'),
      cek: lampuTepat,
    },
    tulis: {
      tempat: 'Lorong kelas X',
      cerita: 'Ada dua kelas lagi: saklar X PPLG 3 di petak 3 dan saklar X PPLG 4 di petak 5. Tulis programnya sendiri dari awal: lampu kelas yang gelap dinyalakan, lampu kelas yang terang dimatikan.',
      peta: {
        ubin: LORONG,
        bit: { x: 1, y: 2 },
        saklar: [
          { x: 3, y: 2, cahaya: 35, nyala: false, nama: 'kelas X PPLG 3' },
          { x: 5, y: 2, cahaya: 85, nyala: true, nama: 'kelas X PPLG 4' },
        ],
      },
      varian: [{
        ubin: LORONG,
        bit: { x: 1, y: 2 },
        saklar: [
          { x: 3, y: 2, cahaya: 90, nyala: true, nama: 'kelas X PPLG 3' },
          { x: 5, y: 2, cahaya: 20, nyala: false, nama: 'kelas X PPLG 4' },
        ],
      }],
      keteranganVarian: 'cahaya kedua kelas ditukar',
      kode: kosong(['Bit ada di petak 1. Saklar ada di petak 3 dan 5.', 'Kelas gelap (cahaya < 50): nyalakan lampu. Kelas terang: matikan lampu.']),
      syarat: (k) => (hitung(k, /\belse\b/g) < 1 ? 'Gunakan if-else supaya Bit memilih salah satu: menyalakan atau mematikan lampu.' : null),
      petunjuk: [
        'Untuk setiap saklar: maju(); sampai tepat di atas saklar, baca cahaya dengan cek_cahaya(), lalu pilih nyalakan_lampu(); atau matikan_lampu(); dengan if-else.',
        'Bentuknya: if (cahaya < 50) { nyalakan_lampu(); } else { matikan_lampu(); }. Dari petak 1 ke petak 3 perlu dua kali maju();.',
      ],
      kerangka: C('    int cahaya;\n\n    maju();\n    maju();\n    cahaya = cek_cahaya();\n    if (cahaya < 50) {\n        ___;\n    } else {\n        ___;\n    }\n\n    ___;\n    ___;\n    cahaya = cek_cahaya();\n    if (___) {\n        nyalakan_lampu();\n    } else {\n        matikan_lampu();\n    }'),
      solusi: C('    int cahaya;\n    maju();\n    maju();\n    cahaya = cek_cahaya();\n    if (cahaya < 50) {\n        nyalakan_lampu();\n    } else {\n        matikan_lampu();\n    }\n    maju();\n    maju();\n    cahaya = cek_cahaya();\n    if (cahaya < 50) {\n        nyalakan_lampu();\n    } else {\n        matikan_lampu();\n    }'),
      cek: lampuTepat,
    },
    aturan: {
      pertanyaan: 'Pernyataan mana yang sesuai dengan temuanmu?',
      pilihan: [
        { id: 'a', teks: 'Isi kedua blok dijalankan berurutan, blok if dulu lalu blok else.' },
        { id: 'b', teks: 'Pada if-else, tepat satu blok yang dijalankan: blok if jika kondisi benar (1), blok else jika kondisi salah (0).' },
        { id: 'c', teks: 'Blok else selalu dijalankan setelah blok if selesai.' },
      ],
      benar: 'b',
      petunjukSalah: 'Lihat lagi baris yang disorot saat cahaya = 80 dan saat cahaya = 30. Apakah kedua blok pernah disorot dalam satu kali jalan?',
    },
    diskusi: [
      'Apa yang terjadi kalau bagian else dihapus dan ruangan terang? Apakah lampunya tetap mati?',
      'Sebutkan satu keputusan sehari-hari di sekolah yang cocok ditulis dengan if-else.',
    ],
  },

  // ============================================================ BAB PERULANGAN
  {
    id: 'L5',
    nomor: 5,
    bab: 'Perulangan',
    judul: 'Antar Buku ke Perpustakaan',
    konsep: 'Perulangan for',
    ct: 'Pengenalan pola: perintah yang sama diulang beberapa kali.',
    durasi: '± 7 menit',
    tokoh: 'sari',
    tempat: 'Perpustakaan',
    suasana: 'perpus',
    perintah: ['maju', 'ambil_buku', 'taruh_buku'],
    orientasi: {
      dialog: [
        'Selamat datang di perpustakaan. Ibu sedang menata buku paket yang baru datang.',
        'Bit membawa buku ke rak di ujung ruangan. Seperti waktu membersihkan lorong di hari pertama, menulis maju(); berkali-kali itu melelahkan dan mudah salah hitung.',
        'Coba pelajari perulangan for di bahasa C. Perhatikan baik-baik nilai i dan kapan i++ dijalankan.',
      ],
      misi: 'Pahami berapa kali for mengulang dan nilai i di setiap putaran, lalu antar buku sampai ke rak.',
    },
    percobaan: {
      peta: { ubin: perpus(6), bit: { x: 1, y: 2, bawa: true }, rak: [{ x: 6, y: 2 }] },
      kode: C('    int langkah = 0;\n    for (int i = 0; i < 4; i++) {\n        maju();\n        langkah++;\n    }\n    taruh_buku();'),
    },
    tebakan: {
      pertanyaan: 'Berapa nilai i saat putaran terakhir dijalankan?',
      pilihan: [
        { id: 'a', teks: '4, karena kondisinya i < 4.' },
        { id: 'b', teks: '3, karena i dimulai dari 0 dan berhenti sebelum 4.' },
        { id: 'c', teks: '5, karena perulangan berjalan satu kali lebih banyak.' },
      ],
      benar: 'b',
      hasilNyata: (h) => {
        const nilaiI = h.langkah.filter((l) => l.aksi === 'maju' && l.vars.i).map((l) => l.vars.i.nilai);
        const terakhir = Math.max(...nilaiI);
        return terakhir === 3 ? 'b' : terakhir === 4 ? 'a' : 'c';
      },
      penjelasan: 'Perulangan dimulai dengan i = 0. Sebelum setiap putaran, kondisi i < 4 dicek. Setelah isi perulangan selesai, i++ menambah i satu. Putaran dijalankan untuk i = 0, 1, 2, 3, jadi ada 4 putaran dan nilai i pada putaran terakhir adalah 3. Saat i menjadi 4, kondisi bernilai salah (0) dan perulangan berhenti.',
    },
    investigasi: {
      pemandu: [
        'Jalankan langkah demi langkah. Perhatikan urutannya: cek kondisi, isi perulangan, lalu i++.',
        'Ganti i < 4 menjadi i < 2. Di mana Bit berhenti, dan apa yang terjadi pada bukunya?',
        'Mengapa taruh_buku(); hanya dijalankan sekali?',
      ],
    },
    perbaikan: {
      cerita: 'Bu Sari meminta Bit mengambil tumpukan buku lalu menaruhnya di rak. Bit malah menjatuhkan buku di tengah jalan. Perbaiki kodenya.',
      peta: { ubin: perpus(7), bit: { x: 1, y: 2 }, rak: [{ x: 7, y: 2 }], buku: [{ x: 1, y: 2 }] },
      kode: C('    ambil_buku();\n    for (int i = 0; i < 5; i++) {\n        maju();\n        taruh_buku();\n    }'),
      solusi: C('    ambil_buku();\n    for (int i = 0; i < 5; i++) {\n        maju();\n    }\n    taruh_buku();'),
      cek: bukuDiRak,
    },
    sublevel: {
      cerita: 'Latihan lebih sederhana: rak berada lebih dekat. Isi bagian ___ dengan angka yang tepat.',
      petunjuk: 'Hitung petak dari Bit sampai tepat di depan rak. Dengan i dimulai dari 0, kondisi i < n membuat perulangan berjalan n kali.',
      peta: { ubin: perpus(5), bit: { x: 1, y: 2 }, rak: [{ x: 5, y: 2 }], buku: [{ x: 1, y: 2 }] },
      kode: C('    ambil_buku();\n    for (int i = 0; i < ___; i++) {\n        maju();\n    }\n    taruh_buku();'),
      solusi: C('    ambil_buku();\n    for (int i = 0; i < 3; i++) {\n        maju();\n    }\n    taruh_buku();'),
      cek: bukuDiRak,
    },
    tulis: {
      cerita: 'Rak baru dipasang di petak 8. Tulis programnya sendiri dari awal: ambil buku di petak 1, lalu bawa ke rak memakai perulangan for.',
      peta: { ubin: perpus(8), bit: { x: 1, y: 2 }, rak: [{ x: 8, y: 2 }], buku: [{ x: 1, y: 2 }] },
      varian: [],
      kode: kosong(['Bit dan tumpukan buku ada di petak 1. Rak ada di petak 8.', 'Gunakan for supaya maju(); cukup ditulis satu kali.']),
      syarat: (k) => {
        if (hitung(k, /\b(for|while)\s*\(/g) < 1) return 'Misi ini harus memakai perulangan for.';
        if (hitung(k, /\bmaju\s*\(/g) > 1) return 'Gunakan for supaya maju(); cukup ditulis satu kali di dalam perulangan.';
        return null;
      },
      petunjuk: [
        'Urutannya: ambil_buku();, maju sampai tepat di depan rak, lalu taruh_buku();. Rak di petak 8, jadi Bit berhenti di petak 7.',
        'Dari petak 1 ke petak 7 perlu 6 langkah: for (int i = 0; i < 6; i++) { maju(); }',
      ],
      kerangka: C('    ambil_buku();\n    for (int i = 0; i < ___; i++) {\n        ___;\n    }\n    ___;'),
      solusi: C('    ambil_buku();\n    for (int i = 0; i < 6; i++) {\n        maju();\n    }\n    taruh_buku();'),
      cek: bukuDiRak,
    },
    aturan: {
      pertanyaan: 'Pernyataan mana yang sesuai dengan temuanmu?',
      pilihan: [
        { id: 'a', teks: 'for (int i = 0; i < n; i++) mengulang n kali dengan i bernilai 1 sampai n.' },
        { id: 'b', teks: 'for (int i = 0; i < n; i++) mengulang n + 1 kali.' },
        { id: 'c', teks: 'for (int i = 0; i < n; i++) mengulang n kali dengan i bernilai 0 sampai n - 1, dan i++ dijalankan setelah isi perulangan.' },
      ],
      benar: 'c',
      petunjukSalah: 'Lihat lagi nilai i di tabel variabel pada putaran pertama dan terakhir, serta kapan i++ disorot.',
    },
    diskusi: [
      'Bagaimana cara mengetahui perintah mana saja yang ikut diulang?',
      'Kalau rak berada 10 petak di depan, bagian mana dari kode yang perlu diubah?',
    ],
  },

  {
    id: 'L6',
    nomor: 6,
    bab: 'Perulangan',
    judul: 'Lorong Bersih',
    konsep: 'Perulangan dengan percabangan',
    ct: 'Dekomposisi dan abstraksi: memecah tugas per petak dan hanya bertindak di petak yang perlu.',
    durasi: '± 8 menit',
    tokoh: 'darto',
    tempat: 'Lorong kelas X',
    suasana: 'lorong',
    perintah: ['maju', 'pungut', 'ada_sampah'],
    orientasi: {
      dialog: [
        'Wah, lorong kelas X kotor setelah jam istirahat.',
        'Bit berjalan di sepanjang lorong. Supaya baterainya hemat, Bit cukup memungut di petak yang ada sampahnya saja.',
        'Bit juga harus melapor berapa sampah yang dipungut dengan printf. Ayo pelajari cara menggabungkan for dan if.',
      ],
      misi: 'Pahami cara if bekerja di dalam perulangan, lalu bersihkan lorong dan laporkan jumlah sampah dengan tepat.',
    },
    percobaan: {
      peta: { ubin: LORONG, bit: { x: 1, y: 2 }, sampah: [{ x: 3, y: 2 }, { x: 5, y: 2 }, { x: 8, y: 2 }] },
      kode: C('    int jumlah = 0;\n    for (int i = 0; i < 5; i++) {\n        maju();\n        if (ada_sampah()) {\n            pungut();\n            jumlah++;\n        }\n    }\n    printf("%d\\n", jumlah);'),
    },
    tebakan: {
      pertanyaan: 'Perhatikan peta. Angka berapa yang ditampilkan printf?',
      pilihan: [
        { id: 'a', teks: '5, karena perulangannya berjalan 5 kali.' },
        { id: 'b', teks: '3, karena ada 3 sampah di lorong.' },
        { id: 'c', teks: '2, karena hanya 2 sampah yang dilewati Bit dalam 5 langkah.' },
      ],
      benar: 'c',
      hasilNyata: (h) => {
        const n = angkaTerakhir(h.output);
        return n === 2 ? 'c' : n === 3 ? 'b' : 'a';
      },
      penjelasan: 'Bit maju 5 petak, dari petak 1 sampai petak 6. Kondisi ada_sampah() dicek di setiap putaran dan hanya bernilai 1 di petak 3 dan 5. Sampah di petak 8 tidak terjangkau, jadi jumlah bernilai 2 dan printf menampilkan 2.',
    },
    investigasi: {
      pemandu: [
        'Jalankan langkah demi langkah. Pada putaran ke berapa saja baris pungut(); disorot?',
        'Perhatikan bahwa kondisi if dicek ulang di setiap putaran.',
        'Ganti i < 5 menjadi i < 7. Berapa angka yang ditampilkan sekarang?',
      ],
    },
    perbaikan: {
      cerita: 'Lorong yang lebih panjang punya 4 sampah. Bit memungut semuanya, tetapi laporannya salah. Perbaiki kodenya supaya jumlah yang dilaporkan sama dengan sampah yang dipungut.',
      peta: { ubin: LORONG, bit: { x: 1, y: 2 }, sampah: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 7, y: 2 }] },
      kode: C('    int jumlah = 0;\n    for (int i = 0; i < 7; i++) {\n        maju();\n        if (ada_sampah()) {\n            pungut();\n        }\n        jumlah++;\n    }\n    printf("%d\\n", jumlah);'),
      solusi: C('    int jumlah = 0;\n    for (int i = 0; i < 7; i++) {\n        maju();\n        if (ada_sampah()) {\n            pungut();\n            jumlah++;\n        }\n    }\n    printf("%d\\n", jumlah);'),
      cek: lorongBersih,
    },
    sublevel: {
      cerita: 'Latihan lebih sederhana: lorong pendek dengan satu sampah. Isi bagian ___ supaya jumlah hanya bertambah saat sampah dipungut.',
      petunjuk: 'Penambah jumlah harus berada di dalam kurung kurawal if, sejajar dengan pungut();.',
      peta: { ubin: LORONG, bit: { x: 1, y: 2 }, sampah: [{ x: 3, y: 2 }] },
      kode: C('    int jumlah = 0;\n    for (int i = 0; i < 3; i++) {\n        maju();\n        if (ada_sampah()) {\n            pungut();\n            ___;\n        }\n    }\n    printf("%d\\n", jumlah);'),
      solusi: C('    int jumlah = 0;\n    for (int i = 0; i < 3; i++) {\n        maju();\n        if (ada_sampah()) {\n            pungut();\n            jumlah++;\n        }\n    }\n    printf("%d\\n", jumlah);'),
      cek: lorongBersih,
    },
    tulis: {
      cerita: 'Setelah jam pulang, sampah berserakan lagi. Tulis programnya sendiri dari awal: Bit menyusuri lorong dari petak 2 sampai petak 8, memungut sampah, lalu melaporkan jumlahnya dengan printf.',
      peta: { ubin: LORONG, bit: { x: 1, y: 2 }, sampah: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 6, y: 2 }, { x: 8, y: 2 }] },
      varian: [
        { ubin: LORONG, bit: { x: 1, y: 2 }, sampah: [{ x: 4, y: 2 }, { x: 5, y: 2 }, { x: 7, y: 2 }] },
        { ubin: LORONG, bit: { x: 1, y: 2 }, sampah: [] },
      ],
      keteranganVarian: 'letak dan jumlah sampah diganti',
      kode: kosong(['Bit ada di petak 1. Telusuri lorong sampai petak 8.', 'Pungut sampah jika ada, hitung, lalu tampilkan jumlahnya dengan printf.']),
      syarat: (k) => {
        if (hitung(k, /\b(for|while)\s*\(/g) < 1) return 'Gunakan perulangan for untuk menyusuri lorong.';
        if (hitung(k, /\bif\s*\(/g) < 1) return 'Gunakan if supaya Bit hanya memungut di petak yang ada sampahnya.';
        if (hitung(k, /\bprintf\s*\(/g) < 1) return 'Laporkan jumlah sampah dengan printf("%d\\n", jumlah);';
        return null;
      },
      petunjuk: [
        'Buat variabel jumlah = 0. Dari petak 1 ke petak 8 ada 7 langkah, jadi perulangannya 7 kali. Di setiap putaran: maju();, lalu cek ada_sampah().',
        'Di dalam if (ada_sampah()) { ... } tulis pungut(); dan jumlah++;. Setelah perulangan selesai, tulis printf("%d\\n", jumlah);',
      ],
      kerangka: C('    int jumlah = 0;\n    for (int i = 0; i < ___; i++) {\n        maju();\n        if (___) {\n            pungut();\n            ___;\n        }\n    }\n    printf("%d\\n", ___);'),
      solusi: C('    int jumlah = 0;\n    for (int i = 0; i < 7; i++) {\n        maju();\n        if (ada_sampah()) {\n            pungut();\n            jumlah++;\n        }\n    }\n    printf("%d\\n", jumlah);'),
      cek: lorongBersih,
    },
    aturan: {
      pertanyaan: 'Pernyataan mana yang sesuai dengan temuanmu?',
      pilihan: [
        { id: 'a', teks: 'if di dalam for hanya dicek sekali di putaran pertama.' },
        { id: 'b', teks: 'if di dalam for dicek ulang di setiap putaran, jadi isinya bisa dijalankan di sebagian putaran saja.' },
        { id: 'c', teks: 'Jika kondisi if pernah benar sekali, isinya dijalankan di semua putaran berikutnya.' },
      ],
      benar: 'b',
      petunjukSalah: 'Lihat lagi panel Kondisi di setiap putaran. Apakah hasilnya selalu sama?',
    },
    diskusi: [
      'Kenapa letak jumlah++; di dalam atau di luar kurung kurawal if mengubah hasil laporan?',
      'Bagaimana kamu memecah tugas membersihkan lorong menjadi langkah-langkah kecil?',
    ],
  },
];

// Misi tulis sendiri diawali daftar isi bit.h, supaya siswa yang menulis
// dari nol langsung tahu perintah dan contoh variabel yang bisa dipakai.
for (const l of LEVEL) {
  l.pakaiPrintf = /printf/.test(l.tulis.solusi);
  const daftar = [
    '// Isi bit.h yang bisa kamu pakai:',
    ...l.perintah.map((p) => `//   ${CONTOH_PAKAI[p]}`),
  ];
  if (l.pakaiPrintf) daftar.push('// Dari stdio.h:', `//   ${CONTOH_PAKAI.printf}`);
  l.tulis.kode = l.tulis.kode.replace('#include "bit.h"\n', `#include "bit.h"\n${daftar.join('\n')}\n`);
}

export const ambilLevel = (id) => LEVEL.find((l) => l.id === id);
