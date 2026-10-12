// Penyimpanan keadaan game dan pencatatan progres siswa.
// Jika backend FastAPI aktif, setiap perubahan progres dikirim ke /api
// supaya muncul di dasbor guru. Jika tidak ada backend (misalnya saat
// prototipe dibuka sebagai halaman tunggal), data disimpan di memori saja.

import { useSyncExternalStore } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';
const TANPA_API = import.meta.env.VITE_TANPA_API === '1';

export function progresBaru() {
  return {
    fase: 'orientasi',
    tebakan: null,
    tebakanBenar: null,
    jalankan: 0,
    eksperimen: 0,
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
    dikirim: false,
    selesai: false,
    mulai: Date.now(),
    selesaiPada: null,
  };
}

let state = {
  layar: 'mulai',
  siswaId: null,
  siswa: {},
  levelAktif: 'L1',
  daring: false,
};

const pendengar = new Set();
function ubah(fn) {
  state = fn(state);
  pendengar.forEach((p) => p());
}

export function pulihkan(data) {
  if (data && data.siswa) state = { ...state, ...data };
}

export const toko = {
  ambil: () => state,
  langgan(p) { pendengar.add(p); return () => pendengar.delete(p); },
};

export function useToko(pilih) {
  return useSyncExternalStore(toko.langgan, () => pilih(state));
}

// ------------------------------------------------------------------ API
async function kirim(jalur, isi, metode = 'POST') {
  if (TANPA_API || !state.daring) return null;
  try {
    const r = await fetch(`${API}${jalur}`, {
      method: metode,
      headers: { 'Content-Type': 'application/json' },
      body: isi ? JSON.stringify(isi) : undefined,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function cekBackend() {
  if (TANPA_API) return false;
  try {
    const r = await fetch(`${API}/kesehatan`);
    const ok = r.ok;
    ubah((s) => ({ ...s, daring: ok }));
    return ok;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ aksi
export function pindahLayar(layar, extra = {}) {
  ubah((s) => ({ ...s, layar, ...extra }));
  try { window.scrollTo({ top: 0 }); } catch { /* abaikan */ }
}

export async function masuk(nama, kelas) {
  const lokalId = `lokal-${Date.now().toString(36)}`;
  ubah((s) => ({
    ...s,
    siswaId: lokalId,
    siswa: { ...s.siswa, [lokalId]: { id: lokalId, nama, kelas, progres: {} } },
    layar: 'level',
  }));
  try { localStorage.setItem('jejak-kode-nama', JSON.stringify({ nama, kelas })); } catch { /* abaikan */ }
  try { window.scrollTo({ top: 0 }); } catch { /* abaikan */ }
  const r = await kirim('/siswa', { nama, kelas });
  if (r && r.id) {
    const id = String(r.id);
    ubah((s) => {
      const siswa = { ...s.siswa };
      siswa[id] = { ...siswa[lokalId], id };
      delete siswa[lokalId];
      return { ...s, siswa, siswaId: id };
    });
  }
}

export function namaTersimpan() {
  try { return JSON.parse(localStorage.getItem('jejak-kode-nama')) || null; } catch { return null; }
}

export function siswaAktif() {
  return state.siswa[state.siswaId] || null;
}

export function progres(levelId) {
  const s = siswaAktif();
  return (s && s.progres[levelId]) || null;
}

export function mulaiLevel(levelId) {
  ubah((s) => {
    const sw = s.siswa[s.siswaId];
    if (!sw) return s;
    const lama = sw.progres[levelId];
    const p = lama || progresBaru();
    return {
      ...s,
      layar: 'main',
      levelAktif: levelId,
      siswa: { ...s.siswa, [sw.id]: { ...sw, progres: { ...sw.progres, [levelId]: p } } },
    };
  });
  sinkron(levelId);
  try { window.scrollTo({ top: 0 }); } catch { /* abaikan */ }
}

export function catat(levelId, patch) {
  ubah((s) => {
    const sw = s.siswa[s.siswaId];
    if (!sw) return s;
    const lama = sw.progres[levelId] || progresBaru();
    const baru = { ...lama, ...(typeof patch === 'function' ? patch(lama) : patch) };
    return { ...s, siswa: { ...s.siswa, [sw.id]: { ...sw, progres: { ...sw.progres, [levelId]: baru } } } };
  });
  sinkron(levelId);
}

let antre = {};
function sinkron(levelId) {
  const sw = siswaAktif();
  if (!sw || sw.id.startsWith('lokal-')) return;
  clearTimeout(antre[levelId]);
  antre[levelId] = setTimeout(() => {
    kirim('/progres', { siswa_id: Number(sw.id), level_id: levelId, data: sw.progres[levelId] });
  }, 400);
}

export async function ambilDasbor() {
  const r = await kirim('/dasbor', null, 'GET');
  if (r && Array.isArray(r.siswa)) {
    return { sumber: 'server', siswa: r.siswa.map((x) => ({ ...x, id: String(x.id) })) };
  }
  return { sumber: 'lokal', siswa: Object.values(state.siswa) };
}

export function keluar() {
  ubah((s) => ({ ...s, siswaId: null, layar: 'mulai' }));
}
