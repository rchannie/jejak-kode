import { jalankan, KodeError } from './interpreter.js';
import { buatDunia } from './dunia.js';

// Penjalan langkah demi langkah. Dipakai tombol "Langkah" dan "Jalankan".
export function buatPenjalan(kode, peta, perintah) {
  const dunia = buatDunia(peta, perintah);
  const gen = jalankan(kode, dunia);
  let selesai = false;
  let galat = null;
  let terakhir = null;

  return {
    dunia,
    get selesai() { return selesai; },
    get galat() { return galat; },
    get terakhir() { return terakhir; },
    langkah() {
      if (selesai) return { selesai: true };
      try {
        const r = gen.next();
        if (r.done) {
          selesai = true;
          return { selesai: true, hasil: r.value };
        }
        terakhir = r.value;
        return { selesai: false, langkah: r.value };
      } catch (e) {
        selesai = true;
        galat = e instanceof KodeError
          ? { baris: e.baris, pesan: e.message }
          : { baris: null, pesan: `Terjadi kesalahan: ${e.message}` };
        dunia.keadaan.bit.ekspresi = 'bingung';
        return { selesai: true, galat };
      }
    },
  };
}

// Menjalankan program sampai habis tanpa animasi (untuk cek misi dan uji otomatis).
export function jalankanSemua(kode, peta, perintah) {
  const p = buatPenjalan(kode, peta, perintah);
  const langkah = [];
  let r;
  do {
    r = p.langkah();
    if (r.langkah) langkah.push(r.langkah);
  } while (!r.selesai);
  const akhir = langkah[langkah.length - 1];
  return {
    langkah,
    galat: p.galat,
    dunia: p.dunia.keadaan,
    vars: akhir ? akhir.vars : {},
    output: akhir ? akhir.output : '',
  };
}
