import { jalankanSemua } from '../engine/runner.js';

// Memeriksa misi "tulis kode sendiri".
// Selain peta utama, kode juga diuji di peta varian (misalnya kelembapan pot
// ditukar) supaya kode yang hanya menghafal urutan perintah tidak lolos.
export function periksaTulis(level, kode, hasilUtama) {
  const t = level.tulis;
  const utama = t.cek(hasilUtama);
  if (!utama.berhasil) return utama;
  const syarat = t.syarat ? t.syarat(kode) : null;
  if (syarat) return { berhasil: false, pesan: syarat };
  for (const peta of t.varian || []) {
    const h = jalankanSemua(kode, peta, level.perintah);
    const r = t.cek(h);
    if (!r.berhasil) {
      return {
        berhasil: false,
        pesan: `Kodemu berhasil di peta ini, tetapi belum berhasil pada uji tambahan saat ${t.keteranganVarian}. ${r.pesan} ${t.saranVarian || 'Pastikan Bit memeriksa keadaan dulu dengan if, bukan langsung menjalankan perintah.'}`,
      };
    }
  }
  const tambahan = t.varian && t.varian.length ? ` Kodemu juga lolos uji tambahan saat ${t.keteranganVarian}.` : '';
  return { berhasil: true, pesan: `${utama.pesan}${tambahan}` };
}
