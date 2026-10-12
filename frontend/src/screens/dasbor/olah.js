// Pengolahan data progres siswa untuk dasbor guru: status, waktu, tingkat
// bantuan, tanda "perlu didampingi", galat yang sering muncul, dan ekspor CSV.
import { FASE, LEVEL } from '../../game/levels.js';
import { isiLkpd } from '../../components/LembarKerja.jsx';

export const namaFase = (id) => (FASE.find((f) => f.id === id) || {}).nama || '-';

export function totalDetik(p) {
  return p && p.waktu ? Object.values(p.waktu).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
}

export function teksWaktu(detik) {
  if (!detik) return '0 mnt';
  const m = Math.floor(detik / 60);
  const j = Math.floor(m / 60);
  if (j) return `${j} j ${m % 60} mnt`;
  if (m) return `${m} mnt`;
  return `${detik} dtk`;
}

export function statusLevel(p) {
  if (!p) return { kode: 'belum', teks: 'Belum mulai' };
  if (p.selesai) return { kode: 'selesai', teks: 'Selesai' };
  return { kode: 'jalan', teks: namaFase(p.fase) };
}

// Seberapa banyak bantuan yang dipakai siswa di level ini.
export function tingkatBantuan(p) {
  if (!p || (!p.perbaikanBerhasil && !p.tulisBerhasil)) return null;
  if (p.sublevelDibuka || p.kerangkaDipakai) return { kode: 'bantuan', teks: 'Dengan bantuan' };
  if ((p.petunjukTulis || 0) > 0) return { kode: 'petunjuk', teks: 'Dengan petunjuk' };
  return { kode: 'mandiri', teks: 'Mandiri' };
}

// Alasan siswa perlu didampingi pada level yang belum selesai.
export function alasanDampingi(p) {
  if (!p || p.selesai) return [];
  const alasan = [];
  if ((p.percobaanPerbaikan || 0) >= 2 && !p.perbaikanBerhasil) alasan.push(`misi perbaikan gagal ${p.percobaanPerbaikan}x`);
  if ((p.percobaanTulis || 0) >= 3 && !p.tulisBerhasil) alasan.push(`kode tulisan sendiri gagal ${p.percobaanTulis}x`);
  if ((p.percobaanAturan || 0) >= 2 && !p.aturanBenar) alasan.push(`salah merumuskan aturan ${p.percobaanAturan}x`);
  const galatBaru = (p.galat || []).filter((g) => Date.now() - g.t < 15 * 60000).length;
  if (galatBaru >= 4) alasan.push(`${galatBaru} galat kode dalam 15 menit terakhir`);
  const lama = (p.waktu || {})[p.fase] || 0;
  if (lama >= 600) alasan.push(`${teksWaktu(lama)} di fase ${namaFase(p.fase).toLowerCase()}`);
  return alasan;
}

// Selisih waktu dari server, supaya "aktif sekarang" tidak terpengaruh jam komputer guru.
export function menitLalu(iso, sekarangServer) {
  if (!iso) return null;
  const acuan = sekarangServer ? new Date(sekarangServer).getTime() : Date.now();
  return Math.max(0, Math.round((acuan - new Date(iso).getTime()) / 60000));
}

export function teksTerakhirAktif(iso, sekarangServer) {
  const m = menitLalu(iso, sekarangServer);
  if (m === null) return 'Belum pernah';
  if (m < 2) return 'Aktif sekarang';
  if (m < 60) return `${m} menit lalu`;
  const j = Math.round(m / 60);
  if (j < 24) return `${j} jam lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// Pesan galat dikelompokkan tanpa nomor baris dan nama variabel tertentu.
export function polaGalat(pesan) {
  return (pesan || '')
    .replace(/[Bb]aris \d+/g, 'baris ...')
    .replace(/\b\d+\b/g, 'N')
    .trim();
}

export function galatTeratas(daftarProgres, n = 3) {
  const hitung = {};
  daftarProgres.forEach((p) => (p && p.galat ? p.galat : []).forEach((g) => {
    const k = polaGalat(g.pesan);
    hitung[k] = (hitung[k] || 0) + 1;
  }));
  return Object.entries(hitung).sort((a, b) => b[1] - a[1]).slice(0, n).map(([pesan, jumlah]) => ({ pesan, jumlah }));
}

export function ringkasLevel(siswa, level) {
  const daftar = siswa.map((s) => ({ s, p: s.progres[level.id] })).filter((x) => x.p);
  const menebak = daftar.filter((x) => x.p.tebakan);
  const salah = {};
  menebak.filter((x) => !x.p.tebakanBenar).forEach((x) => { salah[x.p.tebakan] = (salah[x.p.tebakan] || 0) + 1; });
  const terbanyak = Object.entries(salah).sort((a, b) => b[1] - a[1])[0];
  const selesai = daftar.filter((x) => x.p.selesai);
  const bantuan = { mandiri: 0, petunjuk: 0, bantuan: 0 };
  daftar.forEach((x) => { const b = tingkatBantuan(x.p); if (b) bantuan[b.kode] += 1; });
  return {
    level,
    mulai: daftar.length,
    selesai: selesai.length,
    menebak: menebak.length,
    sesuai: menebak.filter((x) => x.p.tebakanBenar).length,
    miskonsepsi: terbanyak
      ? { teks: (level.tebakan.pilihan.find((o) => o.id === terbanyak[0]) || {}).teks, jumlah: terbanyak[1] }
      : null,
    rataWaktu: selesai.length ? Math.round(selesai.reduce((a, x) => a + totalDetik(x.p), 0) / selesai.length) : 0,
    galat: galatTeratas(daftar.map((x) => x.p), 2),
    bantuan,
    dampingi: daftar.filter((x) => alasanDampingi(x.p).length).map((x) => x.s.nama),
  };
}

// ------------------------------------------------------------------ ekspor CSV
// Satu baris per siswa per level. Pemisah titik koma supaya langsung rapi
// saat dibuka di Excel berbahasa Indonesia; Google Sheets juga bisa membacanya.
const sel = (v) => {
  if (v === null || v === undefined) return '';
  const t = String(v).replace(/\r?\n/g, ' ');
  return /[";]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const yaTidak = (b) => (b ? 'ya' : 'tidak');

export function buatCsv(kelas, siswa) {
  const kepala = [
    'kelas', 'nama', 'username', 'level', 'judul_level', 'bab', 'status', 'fase_terakhir',
    'waktu_total_detik', ...FASE.map((f) => `waktu_${f.id}_detik`),
    'tebakan', 'tebakan_sesuai', 'alasan_tebakan',
    'jalankan_sampai_selesai', 'eksperimen_kode_diubah', 'tekan_langkah', 'jumlah_galat',
    'percobaan_perbaikan', 'perbaikan_berhasil', 'sublevel_dibuka', 'sublevel_berhasil',
    'percobaan_tulis', 'tulis_berhasil', 'petunjuk_dibuka', 'kerangka_dipakai',
    'percobaan_aturan', 'aturan_tepat', 'tingkat_bantuan',
    'pengamatan_1', 'pengamatan_2', 'pengamatan_3', 'temuan', 'refleksi_1', 'refleksi_2',
    'bagian_lkpd_terisi', 'kode_tulis_sendiri', 'mulai', 'selesai_pada',
  ];
  const baris = [kepala.join(';')];
  siswa.forEach((s) => LEVEL.forEach((l) => {
    const p = s.progres[l.id];
    if (!p) return;
    const lk = p.lkpd || {};
    const pilihan = (l.tebakan.pilihan.find((o) => o.id === p.tebakan) || {}).teks;
    const b = tingkatBantuan(p);
    const lkpd = isiLkpd(l, p);
    baris.push([
      kelas.nama, s.nama, s.username, l.nomor, l.judul, l.bab, statusLevel(p).teks, namaFase(p.fase),
      totalDetik(p), ...FASE.map((f) => (p.waktu || {})[f.id] || 0),
      pilihan || '', p.tebakan ? yaTidak(p.tebakanBenar) : '', lk.alasan,
      p.jalankan || 0, p.eksperimen || 0, p.tekanLangkah || 0, p.jumlahGalat || 0,
      p.percobaanPerbaikan || 0, yaTidak(p.perbaikanBerhasil), yaTidak(p.sublevelDibuka), yaTidak(p.sublevelBerhasil),
      p.percobaanTulis || 0, yaTidak(p.tulisBerhasil), p.petunjukTulis || 0, yaTidak(p.kerangkaDipakai),
      p.percobaanAturan || 0, yaTidak(p.aturanBenar), b ? b.teks : '',
      (lk.pengamatan || [])[0], (lk.pengamatan || [])[1], (lk.pengamatan || [])[2], p.temuan,
      (lk.refleksi || [])[0], (lk.refleksi || [])[1],
      `${lkpd.terisi}/${lkpd.total}`, p.tulisBerhasil ? p.kodeTulis : '',
      p.mulai ? new Date(p.mulai).toISOString() : '', p.selesaiPada ? new Date(p.selesaiPada).toISOString() : '',
    ].map(sel).join(';'));
  }));
  return `﻿${baris.join('\r\n')}\r\n`;
}

export function unduh(namaFile, isi, jenis = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([isi], { type: jenis }));
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
