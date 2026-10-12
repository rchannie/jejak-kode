// Penyimpanan keadaan game, akun, dan progres siswa.
//
// Dengan server (FastAPI):
// - Siswa dan guru masuk memakai akun. Sesi disimpan di cookie HttpOnly.
// - Progres siswa (termasuk isi LKPD) dikirim ke server setiap ada perubahan,
//   supaya muncul di dasbor guru dan tidak hilang saat ganti perangkat.
// - Guru bisa mencoba game (mode coba). Progresnya tidak disimpan.
// Tanpa server (versi satu halaman), siswa bermain sebagai tamu dan
// datanya hanya ada di memori selama halaman terbuka.

import { useSyncExternalStore } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';
const TANPA_API = import.meta.env.VITE_TANPA_API === '1';
const JEDA_SIMPAN = 1200;

export function progresBaru() {
  return {
    fase: 'orientasi',
    tebakan: null,
    tebakanBenar: null,
    jalankan: 0,
    eksperimen: 0,
    tekanLangkah: 0,
    tahapKesimpulan: 'banding',
    percobaanPerbaikan: 0,
    perbaikanBerhasil: false,
    sublevelDibuka: false,
    sublevelBerhasil: false,
    aturan: null,
    aturanBenar: null,
    percobaanAturan: 0,
    percobaanTulis: 0,
    tulisBerhasil: false,
    petunjukTulis: 0,
    kerangkaDipakai: false,
    kodeTulis: null,
    temuan: '',
    // LKPD: alasan tebakan, jawaban pertanyaan pengamatan, jawaban refleksi
    lkpd: { alasan: '', pengamatan: [], refleksi: [] },
    // waktu aktif (detik) di setiap fase dan catatan galat kode
    waktu: {},
    jumlahGalat: 0,
    galat: [],
    dikirim: false,
    selesai: false,
    mulai: Date.now(),
    selesaiPada: null,
  };
}

let state = {
  layar: 'mulai', // mulai | level | main | dasbor | ganti-sandi
  server: TANPA_API ? false : null, // null = sedang diperiksa
  info: { daftarGuru: false },
  akun: null, // { id, username, nama, peran, kelas, harusGantiSandi }
  mode: null, // 'siswa' | 'tamu' | 'pratinjau'
  tamu: null, // { nama, kelas } saat bermain tanpa server
  progres: {},
  levelAktif: 'L1',
  simpan: 'tersimpan', // tersimpan | menyimpan | gagal
  sesiHabis: false,
};

const pendengar = new Set();
function ubah(fn) {
  state = fn(state);
  pendengar.forEach((p) => p());
}

// Dipakai saat halaman dimuat ulang di lingkungan pratinjau (artifact).
export function pulihkan(data) {
  if (data && data.mode) state = { ...state, ...data };
}

export const toko = {
  ambil: () => state,
  langgan(p) { pendengar.add(p); return () => pendengar.delete(p); },
};

export function useToko(pilih) {
  return useSyncExternalStore(toko.langgan, () => pilih(state));
}

// ------------------------------------------------------------------ API
// Mengembalikan { ok, status, data, pesan }. Tidak pernah melempar galat.
export async function api(jalur, { metode = 'GET', isi } = {}) {
  try {
    const r = await fetch(`${API}${jalur}`, {
      method: metode,
      credentials: 'same-origin',
      headers: isi !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: isi !== undefined ? JSON.stringify(isi) : undefined,
    });
    let data = null;
    try { data = await r.json(); } catch { /* bukan JSON */ }
    const pesan = data && typeof data.detail === 'string'
      ? data.detail
      : r.ok ? '' : `Server menolak permintaan (kode ${r.status}).`;
    return { ok: r.ok, status: r.status, data, pesan };
  } catch {
    return { ok: false, status: 0, data: null, pesan: 'Tidak bisa terhubung ke server. Periksa koneksi internet atau WiFi sekolah.' };
  }
}

// Memeriksa server dan sesi saat aplikasi dibuka.
export async function mulaiAplikasi() {
  if (TANPA_API) return;
  const sehat = await api('/kesehatan');
  if (!sehat.ok) {
    ubah((s) => ({ ...s, server: false }));
    return;
  }
  const info = await api('/info');
  ubah((s) => ({ ...s, server: true, info: info.ok ? info.data : s.info }));
  if (state.akun) return;
  const saya = await api('/akun/saya');
  if (saya.ok) terimaAkun(saya.data);
}

function layarAwal(pengguna) {
  if (pengguna.harusGantiSandi) return 'ganti-sandi';
  return pengguna.peran === 'guru' ? 'dasbor' : 'level';
}

function terimaAkun(data) {
  const p = data.pengguna;
  ubah((s) => ({
    ...s,
    akun: p,
    mode: p.peran === 'siswa' ? 'siswa' : null,
    progres: p.peran === 'siswa' ? (data.progres || {}) : {},
    layar: layarAwal(p),
    sesiHabis: false,
    simpan: 'tersimpan',
  }));
  try { window.scrollTo({ top: 0 }); } catch { /* abaikan */ }
}

// ------------------------------------------------------------------ akun
export async function masuk(username, sandi) {
  const r = await api('/akun/masuk', { metode: 'POST', isi: { username, sandi } });
  if (!r.ok) return r;
  const lama = state.akun;
  // Sesi sempat habis di tengah permainan: progres yang belum tersimpan dikirim ulang.
  if (state.sesiHabis && lama && lama.id === r.data.pengguna.id && state.mode === 'siswa') {
    ubah((s) => ({ ...s, sesiHabis: false, akun: r.data.pengguna }));
    Object.keys(kotor).forEach((id) => sinkron(id));
    return r;
  }
  terimaAkun(r.data);
  return r;
}

export async function daftarSiswa(isi) {
  const r = await api('/akun/daftar-siswa', { metode: 'POST', isi });
  if (r.ok) terimaAkun(r.data);
  return r;
}

export async function daftarGuru(isi) {
  const r = await api('/akun/daftar-guru', { metode: 'POST', isi });
  if (r.ok) terimaAkun(r.data);
  return r;
}

export async function gantiSandi(sandiLama, sandiBaru) {
  const r = await api('/akun/ganti-sandi', { metode: 'POST', isi: { sandiLama, sandiBaru } });
  if (r.ok) {
    ubah((s) => {
      const akun = { ...s.akun, harusGantiSandi: false };
      return { ...s, akun, layar: s.layar === 'ganti-sandi' ? layarAwal(akun) : s.layar };
    });
  }
  return r;
}

export async function keluar() {
  if (state.akun) await api('/akun/keluar', { metode: 'POST' });
  Object.keys(kotor).forEach((k) => delete kotor[k]);
  ubah((s) => ({
    ...s, akun: null, mode: null, tamu: null, progres: {}, layar: 'mulai', sesiHabis: false, simpan: 'tersimpan',
  }));
}

// Bermain tanpa server (versi satu halaman).
export function mainTamu(nama, kelas) {
  ubah((s) => ({ ...s, mode: 'tamu', tamu: { nama, kelas }, progres: {}, layar: 'level' }));
  try { localStorage.setItem('jejak-kode-nama', JSON.stringify({ nama, kelas })); } catch { /* abaikan */ }
}

export function namaTersimpan() {
  try { return JSON.parse(localStorage.getItem('jejak-kode-nama')) || null; } catch { return null; }
}

// Guru mencoba game. Progres hanya di memori dan tidak dikirim ke server.
export function cobaSebagaiGuru() {
  ubah((s) => ({ ...s, mode: 'pratinjau', progres: {}, layar: 'level' }));
}

export function selesaiCoba() {
  ubah((s) => ({ ...s, mode: null, progres: {}, layar: 'dasbor' }));
}

export function namaPemain(s = state) {
  if (s.akun) return s.akun.nama;
  if (s.tamu) return s.tamu.nama;
  return '';
}

// ------------------------------------------------------------------ navigasi dan progres
export function pindahLayar(layar, extra = {}) {
  ubah((s) => ({ ...s, layar, ...extra }));
  try { window.scrollTo({ top: 0 }); } catch { /* abaikan */ }
}

export function mulaiLevel(levelId) {
  ubah((s) => ({
    ...s,
    layar: 'main',
    levelAktif: levelId,
    progres: s.progres[levelId] ? s.progres : { ...s.progres, [levelId]: progresBaru() },
  }));
  sinkron(levelId);
  try { window.scrollTo({ top: 0 }); } catch { /* abaikan */ }
}

export function catat(levelId, patch) {
  ubah((s) => {
    const lama = { ...progresBaru(), ...(s.progres[levelId] || {}) };
    const baru = { ...lama, ...(typeof patch === 'function' ? patch(lama) : patch) };
    return { ...s, progres: { ...s.progres, [levelId]: baru } };
  });
  sinkron(levelId);
}

// Mengisi satu bagian LKPD, misalnya catatLkpd('L1', { alasan: '...' }) atau
// catatLkpd('L1', (lk) => ({ pengamatan: [...] })) jika butuh isi LKPD terbaru.
export function catatLkpd(levelId, patch) {
  catat(levelId, (p) => {
    const lama = { ...progresBaru().lkpd, ...(p.lkpd || {}) };
    return { lkpd: { ...lama, ...(typeof patch === 'function' ? patch(lama) : patch) } };
  });
}

// ------------------------------------------------------------------ sinkron ke server
const antre = {};
const kotor = {};
function sinkron(levelId) {
  if (state.mode !== 'siswa' || !state.server) return;
  kotor[levelId] = true;
  clearTimeout(antre[levelId]);
  antre[levelId] = setTimeout(() => kirimProgres(levelId), JEDA_SIMPAN);
}

async function kirimProgres(levelId) {
  if (state.mode !== 'siswa' || state.sesiHabis) return;
  ubah((s) => ({ ...s, simpan: 'menyimpan' }));
  const r = await api(`/progres/${levelId}`, { metode: 'PUT', isi: { data: state.progres[levelId] } });
  if (r.ok) {
    delete kotor[levelId];
    ubah((s) => ({ ...s, simpan: Object.keys(kotor).length ? 'menyimpan' : 'tersimpan' }));
    return;
  }
  if (r.status === 401) {
    ubah((s) => ({ ...s, sesiHabis: true, simpan: 'gagal' }));
    return;
  }
  // Koneksi terputus: coba lagi beberapa detik kemudian.
  ubah((s) => ({ ...s, simpan: 'gagal' }));
  clearTimeout(antre[levelId]);
  antre[levelId] = setTimeout(() => kirimProgres(levelId), 5000);
}

// Peringatan sebelum menutup halaman jika masih ada progres yang belum terkirim.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (state.mode === 'siswa' && Object.keys(kotor).length) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
