import { useEffect, useRef, useState } from 'react';
import { buatPenjalan } from '../engine/runner.js';
import { buatDunia } from '../engine/dunia.js';

// Isi satu baris jejak langkah. Dipakai juga saat menampilkan ulang hasil
// kode percobaan di tahap Bandingkan tebakan.
export function ringkasLangkah(l) {
  return {
    nomor: l.nomor,
    baris: l.baris,
    pesan: l.pesan,
    akibat: l.akibat || null,
    peringatan: !!l.peringatan,
    hitung: l.hitung || null,
    kondisi: l.kondisi || null,
  };
}

// Mengatur eksekusi kode langkah demi langkah untuk satu peta.
// kunci berubah = peta berganti, jadi semuanya diulang dari awal.

export function usePenjalan({ kode, peta, perintah, kunci, onSelesai, jeda = 650 }) {
  const penjalan = useRef(null);
  const timer = useRef(null);
  const selesaiRef = useRef(onSelesai);
  selesaiRef.current = onSelesai;

  const keadaanAwal = () => ({
    keadaan: buatDunia(peta, perintah).salin(),
    langkah: null,
    kondisi: null,
    galat: null,
    selesai: false,
    berjalan: false,
    sudahMulai: false,
    riwayat: [],
  });
  const [t, setT] = useState(keadaanAwal);

  function hentikan() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  useEffect(() => {
    hentikan();
    penjalan.current = null;
    setT(keadaanAwal());
    return hentikan;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci, kode]);

  function satuLangkah() {
    if (!penjalan.current) penjalan.current = buatPenjalan(kode, peta, perintah);
    const p = penjalan.current;
    if (p.selesai) return;
    const r = p.langkah();
    const keadaan = p.dunia.salin();
    // Jejak langkah: ringkasan setiap langkah yang sudah dijalankan, berurutan.
    const catatan = r.langkah
      ? ringkasLangkah(r.langkah)
      : r.galat ? { nomor: 'galat', baris: r.galat.baris, pesan: r.galat.pesan, galat: true } : null;
    setT((lama) => ({
      keadaan,
      langkah: r.langkah || lama.langkah,
      kondisi: r.langkah && r.langkah.kondisi
        ? { ...r.langkah.kondisi, baris: r.langkah.baris, nomor: r.langkah.nomor }
        : lama.kondisi,
      galat: r.galat || null,
      selesai: r.selesai,
      berjalan: !!timer.current && !r.selesai,
      sudahMulai: true,
      riwayat: catatan ? [...lama.riwayat, catatan] : lama.riwayat,
    }));
    if (r.selesai) {
      hentikan();
      const akhir = p.terakhir;
      if (selesaiRef.current) {
        selesaiRef.current({
          galat: p.galat,
          dunia: p.dunia.keadaan,
          output: akhir ? akhir.output : [],
          vars: akhir ? akhir.vars : {},
        });
      }
    }
  }

  function jalankan() {
    if (timer.current) { hentikan(); setT((l) => ({ ...l, berjalan: false })); return; }
    if (penjalan.current && penjalan.current.selesai) {
      penjalan.current = null;
    }
    timer.current = setInterval(satuLangkah, jeda);
    setT((l) => (l.selesai ? { ...keadaanAwal(), berjalan: true, sudahMulai: true } : { ...l, berjalan: true }));
    satuLangkah();
  }

  function langkah() {
    if (timer.current) return;
    if (penjalan.current && penjalan.current.selesai) {
      penjalan.current = null;
      setT(keadaanAwal());
    }
    satuLangkah();
  }

  function ulang() {
    hentikan();
    penjalan.current = null;
    setT(keadaanAwal());
  }

  return { ...t, langkahSatu: langkah, jalankan, ulang };
}
