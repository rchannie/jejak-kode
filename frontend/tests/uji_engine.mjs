// Uji otomatis interpreter C dan data level: node tests/uji_engine.mjs
import { LEVEL } from '../src/game/levels.js';
import { jalankanSemua } from '../src/engine/runner.js';
import { periksaTulis } from '../src/game/periksa.js';

let gagal = 0;
const cek = (kondisi, pesan) => { if (!kondisi) { gagal++; console.log('  GAGAL:', pesan); } };

for (const lv of LEVEL) {
  console.log(`${lv.id} ${lv.judul}`);
  const t = jalankanSemua(lv.percobaan.kode, lv.percobaan.peta, lv.perintah);
  cek(!t.galat, `percobaan error: ${t.galat && t.galat.pesan}`);
  cek(lv.tebakan.hasilNyata(t) === lv.tebakan.benar, `kunci tebakan tidak cocok (${lv.tebakan.hasilNyata(t)})`);
  console.log(`  percobaan: ${t.langkah.length} langkah, output=${JSON.stringify(t.output)}`);

  const salah = jalankanSemua(lv.perbaikan.kode, lv.perbaikan.peta, lv.perintah);
  const cs = lv.perbaikan.cek(salah);
  cek(!salah.galat, `kode rusak seharusnya bisa jalan: ${salah.galat && salah.galat.pesan}`);
  cek(!cs.berhasil, 'kode rusak malah berhasil');
  console.log(`  perbaikan rusak -> ${cs.pesan}`);
  const benar = jalankanSemua(lv.perbaikan.solusi, lv.perbaikan.peta, lv.perintah);
  cek(lv.perbaikan.cek(benar).berhasil, `solusi perbaikan gagal: ${lv.perbaikan.cek(benar).pesan}`);

  const sub = jalankanSemua(lv.sublevel.kode, lv.sublevel.peta, lv.perintah);
  cek(sub.galat && /___/.test(sub.galat.pesan), 'sublevel kosong harus error ___');
  const subB = jalankanSemua(lv.sublevel.solusi, lv.sublevel.peta, lv.perintah);
  cek(lv.sublevel.cek(subB).berhasil, `solusi sublevel gagal: ${lv.sublevel.cek(subB).pesan}`);

  const tk = jalankanSemua(lv.tulis.kode, lv.tulis.peta, lv.perintah);
  cek(!tk.galat, `template tulis harus bisa jalan: ${tk.galat && tk.galat.pesan}`);
  cek(!periksaTulis(lv, lv.tulis.kode, tk).berhasil, 'template kosong malah berhasil');
  const kr = jalankanSemua(lv.tulis.kerangka, lv.tulis.peta, lv.perintah);
  cek(kr.galat && /___/.test(kr.galat.pesan), 'kerangka harus error ___');
  const ts = jalankanSemua(lv.tulis.solusi, lv.tulis.peta, lv.perintah);
  const ps = periksaTulis(lv, lv.tulis.solusi, ts);
  cek(ps.berhasil, `solusi tulis gagal: ${ps.pesan}`);
  console.log(`  tulis solusi -> ${ps.pesan}`);
}

// kode hafalan harus ditolak oleh uji varian / syarat
const lv = (id) => LEVEL.find((l) => l.id === id);
const prog = (isi) => `#include <stdio.h>\n#include "bit.h"\n\nint main() {\n${isi}    return 0;\n}\n`;
const uji = (id, kode) => periksaTulis(lv(id), kode, jalankanSemua(kode, lv(id).tulis.peta, lv(id).perintah));

// L1: memungut di setiap petak (asal-asalan) tidak boleh lolos
const sapu = prog('    maju();\n    pungut();\n'.repeat(7));
const r1 = uji('L1', sapu);
cek(!r1.berhasil && /petak kosong/.test(r1.pesan), 'L1 pungut di semua petak lolos');
console.log('L1 pungut di semua petak ->', r1.pesan);

// L2: angka ditulis langsung tanpa cek_cahaya()
const r2a = uji('L2', prog('    printf("%d\\n", 50);\n'));
cek(!r2a.berhasil, 'L2 printf angka langsung lolos');
console.log('L2 angka langsung ->', r2a.pesan);
// L2: cek_cahaya() dipanggil, tetapi yang ditampilkan tetap angka hafalan
const r2b = uji('L2', prog('    maju();\n    int a = cek_cahaya();\n    maju();\n    maju();\n    int b = cek_cahaya();\n    printf("%d\\n", 50);\n'));
cek(!r2b.berhasil && /uji tambahan/.test(r2b.pesan), 'L2 hafalan lolos uji varian');
console.log('L2 hafalan ->', r2b.pesan);
// L2: rata-rata pecahan dengan float tetap diterima
const r2c = uji('L2', prog('    maju();\n    float a = cek_cahaya();\n    maju();\n    maju();\n    float b = cek_cahaya();\n    float rata = (a + b) / 2;\n    printf("%.1f\\n", rata);\n'));
cek(r2c.berhasil, `L2 versi float ditolak: ${r2c.pesan}`);

// L3: urutan hafalan tanpa if
const r3 = uji('L3', prog('    maju();\n    maju();\n    siram();\n'));
cek(!r3.berhasil, 'kode hafalan L3 lolos');
console.log('hafalan L3 ->', r3.pesan);
// L5: tanpa for
const r5 = uji('L5', prog('    ambil_buku();\n' + '    maju();\n'.repeat(6) + '    taruh_buku();\n'));
cek(!r5.berhasil, 'L5 tanpa for lolos');
console.log('tanpa for L5 ->', r5.pesan);

// interpreter: langkah penugasan menampilkan perhitungan ruas kanan
const t2 = jalankanSemua(lv('L2').percobaan.kode, lv('L2').percobaan.peta, lv('L2').perintah);
const isiTotal = t2.langkah.filter((l) => l.hitung && l.hitung.teks.includes('cek_cahaya'));
cek(isiTotal.length === 2 && isiTotal[1].hitung.rincian === '30 + 70' && isiTotal[1].hitung.hasil === '100', `perhitungan L2 tidak sesuai: ${JSON.stringify(isiTotal.map((l) => l.hitung))}`);

// interpreter: langkah kondisi membawa ringkasan akibatnya untuk catatan eksekusi
const t3 = jalankanSemua(lv('L3').percobaan.kode, lv('L3').percobaan.peta, lv('L3').perintah);
const kIf = t3.langkah.find((l) => l.kondisi && l.kondisi.kata === 'if');
cek(kIf && kIf.akibat === 'Isi blok if dijalankan.', `akibat kondisi if L3 tidak sesuai: ${kIf && kIf.akibat}`);
const t5 = jalankanSemua(lv('L5').percobaan.kode, lv('L5').percobaan.peta, lv('L5').perintah);
const kFor = t5.langkah.filter((l) => l.kondisi && l.kondisi.kata === 'for');
cek(kFor.length && /^Perulangan selesai setelah \d+ putaran\.$/.test(kFor[kFor.length - 1].akibat), 'akibat akhir perulangan for L5 tidak sesuai');

console.log(gagal ? `\n${gagal} uji gagal` : '\nSemua uji lulus');
process.exit(gagal ? 1 : 0);
