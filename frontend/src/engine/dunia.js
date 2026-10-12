// Model dunia game: peta berpetak, posisi Bit, dan objek misi.
// Semua perintah yang ditulis siswa (maju, siram, dan seterusnya) mengubah
// keadaan di sini. Kanvas tinggal menggambar keadaan terbaru.

export const UBIN = {
  W: { gambar: 'tembok', padat: true, nama: 'tembok' },
  J: { gambar: 'jendela', padat: true, nama: 'jendela' },
  P: { gambar: 'papan_tulis', padat: true, nama: 'papan tulis' },
  M: { gambar: 'mading', padat: true, nama: 'mading' },
  C: { gambar: 'jam_dinding', padat: true, nama: 'tembok' },
  L: { gambar: 'loker', padat: true, nama: 'loker' },
  F: { gambar: 'pagar_taman', padat: true, nama: 'pagar' },
  '.': { gambar: 'lantai_kayu' },
  ',': { gambar: 'lantai_lorong' },
  '"': { gambar: 'rumput' },
  ':': { gambar: 'jalan_batu' },
  D: { gambar: 'lantai_kayu', atas: 'meja', padat: true, nama: 'meja' },
  R: { gambar: 'lantai_kayu', atas: 'rak_buku', padat: true, nama: 'rak buku' },
  T: { gambar: 'lantai_lorong', atas: 'tong_sampah', padat: true, nama: 'tong sampah' },
  S: { gambar: 'rumput', atas: 'semak', padat: true, nama: 'semak' },
};

let nomorEfek = 0;
const BATAS_KERING = 40;
const BATAS_GELAP = 50;

const SENSOR = {
  cek_kelembapan: 'Mengembalikan angka kelembapan tanah pada pot di bawah Bit.',
  cek_cahaya: 'Mengembalikan angka cahaya di ruangan tempat saklar berada.',
  ada_sampah: 'Mengembalikan 1 jika ada sampah di petak Bit, 0 jika tidak.',
};
const AKSI = {
  maju: 'Bit maju satu petak ke kanan.',
  siram: 'Menyiram pot di bawah Bit.',
  nyalakan_lampu: 'Menyalakan lampu lewat saklar di bawah Bit.',
  matikan_lampu: 'Mematikan lampu lewat saklar di bawah Bit.',
  ambil_buku: 'Mengambil tumpukan buku di bawah Bit.',
  taruh_buku: 'Menaruh buku ke rak tepat di depan Bit.',
  pungut: 'Memungut sampah di petak Bit.',
};
export const PENJELASAN_PERINTAH = { ...AKSI, ...SENSOR };
// Prototipe fungsi seperti yang tertulis di bit.h
export const PROTOTIPE = {
  maju: 'void maju();',
  siram: 'void siram();',
  nyalakan_lampu: 'void nyalakan_lampu();',
  matikan_lampu: 'void matikan_lampu();',
  ambil_buku: 'void ambil_buku();',
  taruh_buku: 'void taruh_buku();',
  pungut: 'void pungut();',
  cek_kelembapan: 'int cek_kelembapan();',
  cek_cahaya: 'int cek_cahaya();',
  ada_sampah: 'int ada_sampah();',
};

// Contoh cara memakai setiap perintah di dalam main(). Perintah sensor
// mengembalikan angka, jadi contohnya langsung menyimpan hasil ke variabel.
export const CONTOH_PAKAI = {
  maju: 'maju();',
  siram: 'siram();',
  nyalakan_lampu: 'nyalakan_lampu();',
  matikan_lampu: 'matikan_lampu();',
  ambil_buku: 'ambil_buku();',
  taruh_buku: 'taruh_buku();',
  pungut: 'pungut();',
  cek_kelembapan: 'int kelembapan = cek_kelembapan();',
  cek_cahaya: 'int cahaya = cek_cahaya();',
  ada_sampah: 'int sampah = ada_sampah();',
  printf: 'printf("%d\\n", jumlah);',
};

const PENJELASAN_CONTOH = {
  cek_kelembapan: 'Membaca kelembapan tanah pot di bawah Bit (angka 0 sampai 100), lalu menyimpannya di variabel kelembapan bertipe int.',
  cek_cahaya: 'Membaca cahaya ruangan (angka 0 sampai 100), lalu menyimpannya di variabel cahaya bertipe int.',
  ada_sampah: 'Memeriksa petak Bit. Variabel sampah berisi 1 jika ada sampah, 0 jika tidak.',
  printf: 'Dari stdio.h. Menampilkan isi variabel jumlah di bagian Keluaran printf. %d berarti angka bulat, \\n berarti pindah baris.',
};

// Daftar isi bit.h untuk satu level: nama perintah, prototipe, contoh pakai, penjelasan.
export function isiBitH(perintah, pakaiPrintf = false) {
  const nama = pakaiPrintf ? [...perintah, 'printf'] : perintah;
  return nama.map((p) => ({
    nama: p,
    prototipe: PROTOTIPE[p] || 'int printf(const char *format, ...);',
    contoh: CONTOH_PAKAI[p],
    penjelasan: PENJELASAN_CONTOH[p] || PENJELASAN_PERINTAH[p],
  }));
}

export function buatDunia(peta, perintah) {
  const st = {
    ubin: peta.ubin.map((r) => r.split('')),
    lebar: peta.ubin[0].length,
    tinggi: peta.ubin.length,
    bit: { x: peta.bit.x, y: peta.bit.y, bawa: !!peta.bit.bawa, ekspresi: 'biasa' },
    tanaman: (peta.tanaman || []).map((t) => ({ ...t, status: t.kelembapan < BATAS_KERING ? 'kering' : 'segar', disiram: 0 })),
    saklar: (peta.saklar || []).map((s) => ({ ...s })),
    sampah: (peta.sampah || []).map((s) => ({ ...s, ada: true })),
    rak: (peta.rak || []).map((r) => ({ ...r, isi: 0 })),
    buku: (peta.buku || []).map((b) => ({ ...b, ada: true })),
    bukuJatuh: [],
    tujuan: (peta.tujuan || []).map((t) => ({ ...t })),
    dipungut: 0,
    peringatan: [],
    jejak: [{ x: peta.bit.x, y: peta.bit.y }],
    efek: null, // efek visual terakhir untuk kanvas
  };

  const izin = new Set(perintah);
  const di = (daftar, x, y) => daftar.find((o) => o.x === x && o.y === y);

  function peringatan(pesan) {
    st.peringatan.push(pesan);
    st.bit.ekspresi = 'bingung';
    return { pesan, peringatan: true };
  }

  const aksi = {
    maju() {
      const nx = st.bit.x + 1;
      const ny = st.bit.y;
      if (nx >= st.lebar) return { fatal: true, pesan: 'Bit sudah di ujung peta dan tidak bisa maju lagi.' };
      const u = UBIN[st.ubin[ny][nx]];
      if (u && u.padat) {
        st.bit.ekspresi = 'bingung';
        return { fatal: true, pesan: `Bit menabrak ${u.nama} di depannya.` };
      }
      st.bit.x = nx;
      st.jejak.push({ x: nx, y: ny });
      st.bit.ekspresi = 'biasa';
      st.efek = { jenis: 'gerak' };
      return { pesan: `Bit maju ke petak (${nx}, ${ny}).` };
    },
    siram() {
      const t = di(st.tanaman, st.bit.x, st.bit.y);
      st.efek = { jenis: 'air', x: st.bit.x, y: st.bit.y };
      if (!t) return peringatan('Tidak ada pot di petak ini. Airnya tumpah ke lantai.');
      t.disiram++;
      if (t.status === 'banjir') return peringatan('Pot ini sudah kebanjiran, tetapi disiram lagi.');
      if (t.kelembapan < BATAS_KERING) {
        const lama = t.kelembapan;
        t.kelembapan = 75;
        t.status = 'segar';
        st.bit.ekspresi = 'senang';
        return { pesan: `Tanaman disiram. Kelembapannya naik dari ${lama} menjadi 75.` };
      }
      t.status = 'banjir';
      return peringatan(`Tanaman ini sudah lembap (${t.kelembapan}), jadi sekarang kebanyakan air.`);
    },
    nyalakan_lampu() {
      const s = di(st.saklar, st.bit.x, st.bit.y);
      if (!s) return { fatal: true, pesan: 'Tidak ada saklar di petak ini.' };
      s.nyala = true;
      st.efek = { jenis: 'lampu', x: s.x, y: s.y };
      return { pesan: `Lampu ${s.nama} dinyalakan.` };
    },
    matikan_lampu() {
      const s = di(st.saklar, st.bit.x, st.bit.y);
      if (!s) return { fatal: true, pesan: 'Tidak ada saklar di petak ini.' };
      s.nyala = false;
      st.efek = { jenis: 'lampu', x: s.x, y: s.y };
      return { pesan: `Lampu ${s.nama} dimatikan.` };
    },
    ambil_buku() {
      const b = st.buku.find((o) => o.ada && o.x === st.bit.x && o.y === st.bit.y);
      if (!b) return { fatal: true, pesan: 'Tidak ada tumpukan buku di petak ini.' };
      if (st.bit.bawa) return peringatan('Bit sudah membawa buku.');
      b.ada = false;
      st.bit.bawa = true;
      return { pesan: 'Bit mengambil tumpukan buku.' };
    },
    taruh_buku() {
      if (!st.bit.bawa) return peringatan('Bit tidak sedang membawa buku.');
      st.bit.bawa = false;
      const r = di(st.rak, st.bit.x + 1, st.bit.y);
      if (r) {
        r.isi++;
        st.bit.ekspresi = 'senang';
        st.efek = { jenis: 'kilau', x: r.x, y: r.y };
        return { pesan: 'Buku diletakkan di rak.' };
      }
      st.bukuJatuh.push({ x: st.bit.x, y: st.bit.y });
      return peringatan('Belum ada rak di depan Bit, jadi bukunya jatuh ke lantai.');
    },
    pungut() {
      const s = st.sampah.find((o) => o.ada && o.x === st.bit.x && o.y === st.bit.y);
      if (!s) return peringatan('Tidak ada sampah di petak ini.');
      s.ada = false;
      st.dipungut++;
      st.bit.ekspresi = 'senang';
      st.efek = { jenis: 'kilau', x: s.x, y: s.y };
      return { pesan: `Sampah dipungut. Total yang sudah dipungut: ${st.dipungut}.` };
    },
  };

  const sensor = {
    cek_kelembapan(baris) {
      const t = di(st.tanaman, st.bit.x, st.bit.y);
      if (!t) throw Object.assign(new Error('Tidak ada pot di petak ini untuk dicek. Pastikan Bit berada di atas pot.'), { baris });
      return t.kelembapan;
    },
    cek_cahaya(baris) {
      const s = di(st.saklar, st.bit.x, st.bit.y);
      if (!s) throw Object.assign(new Error('Tidak ada saklar di petak ini, jadi cahaya tidak bisa diukur.'), { baris });
      return s.cahaya;
    },
    ada_sampah() {
      return !!st.sampah.find((o) => o.ada && o.x === st.bit.x && o.y === st.bit.y);
    },
  };

  return {
    keadaan: st,
    punyaAksi: (n) => izin.has(n) && n in aksi,
    punyaSensor: (n) => izin.has(n) && n in sensor,
    daftarPerintah: () => [...izin],
    aksi(nama, arg) {
      st.efek = null;
      const hasil = aksi[nama](...arg);
      if (st.efek) st.efek.id = ++nomorEfek;
      return hasil;
    },
    sensor(nama, arg, baris) {
      return sensor[nama](baris, ...arg);
    },
    salin: () => JSON.parse(JSON.stringify(st)),
  };
}

export { BATAS_KERING, BATAS_GELAP };
