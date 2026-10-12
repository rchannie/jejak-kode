// Musik latar game.
// Browser tidak mengizinkan suara diputar sebelum pengguna berinteraksi,
// jadi musik baru mulai setelah klik atau tombol keyboard pertama.
// Pengaturan (nyala/mati dan volume) disimpan di browser jika memungkinkan.

import { useSyncExternalStore } from 'react';

const URL_MUSIK = import.meta.env.VITE_URL_MUSIK || `${import.meta.env.BASE_URL}musik/baroque-coffee-house.mp3`;
const KUNCI = 'jejak-kode-pengaturan';

export const INFO_LAGU = {
  judul: 'Baroque Coffee House',
  pencipta: 'Doug Maxwell / Media Right Productions',
};

let pengaturan = { musik: true, volume: 0.4 };
try {
  const tersimpan = JSON.parse(localStorage.getItem(KUNCI));
  if (tersimpan && typeof tersimpan === 'object') {
    pengaturan = {
      musik: tersimpan.musik !== false,
      volume: Number.isFinite(tersimpan.volume) ? Math.min(1, Math.max(0, tersimpan.volume)) : pengaturan.volume,
    };
  }
} catch { /* abaikan */ }

// main: sedang berbunyi; menunggu: menunggu interaksi pertama; gagal: berkas tidak bisa dimuat
let status = { main: false, menunggu: true, gagal: false };
let potret = { ...pengaturan, ...status };
const pendengar = new Set();

function kabari() {
  potret = { ...pengaturan, ...status };
  pendengar.forEach((p) => p());
}
function simpan() {
  try { localStorage.setItem(KUNCI, JSON.stringify(pengaturan)); } catch { /* abaikan */ }
}

let audio = null;
function siapkan() {
  if (audio) return audio;
  audio = new Audio(URL_MUSIK);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;
  audio.addEventListener('playing', () => { status = { ...status, main: true, gagal: false }; kabari(); });
  audio.addEventListener('pause', () => { status = { ...status, main: false }; kabari(); });
  audio.addEventListener('error', () => { status = { ...status, main: false, gagal: true }; kabari(); });
  return audio;
}

// Volume dinaikkan atau diturunkan pelan-pelan supaya tidak mengagetkan.
let jedaPudar = null;
function pudar(target, lama, selesai) {
  clearInterval(jedaPudar);
  const a = audio;
  if (!a) return;
  const awal = a.volume;
  const mulai = Date.now();
  jedaPudar = setInterval(() => {
    const k = Math.min(1, (Date.now() - mulai) / lama);
    a.volume = Math.min(1, Math.max(0, awal + (target - awal) * k));
    if (k >= 1) {
      clearInterval(jedaPudar);
      if (selesai) selesai();
    }
  }, 30);
}

function putar() {
  if (!pengaturan.musik) return;
  const a = siapkan();
  let janji;
  try { janji = a.play(); } catch { janji = null; }
  const berhasil = () => {
    status = { ...status, menunggu: false };
    kabari();
    lepasPemicu();
    pudar(pengaturan.volume, 1200);
  };
  if (janji && typeof janji.then === 'function') {
    janji.then(berhasil).catch(() => { status = { ...status, menunggu: true }; kabari(); });
  } else {
    berhasil();
  }
}

function hentikan() {
  if (!audio) return;
  pudar(0, 400, () => audio.pause());
}

export function setMusik(nyala) {
  pengaturan = { ...pengaturan, musik: Boolean(nyala) };
  simpan();
  kabari();
  if (nyala) putar();
  else hentikan();
}

export function setVolume(nilai) {
  pengaturan = { ...pengaturan, volume: Math.min(1, Math.max(0, nilai)) };
  simpan();
  if (audio && !audio.paused) {
    clearInterval(jedaPudar);
    audio.volume = pengaturan.volume;
  }
  kabari();
}

// Interaksi pertama di halaman membuka izin suara dari browser.
const PEMICU = ['pointerdown', 'keydown', 'touchstart'];
function coba() {
  if (pengaturan.musik && status.menunggu) putar();
}
function lepasPemicu() {
  PEMICU.forEach((e) => window.removeEventListener(e, coba, true));
}

let dijedaOtomatis = false;
let terpasang = false;
export function pasangMusik() {
  if (terpasang || typeof window === 'undefined') return;
  terpasang = true;
  PEMICU.forEach((e) => window.addEventListener(e, coba, true));
  // Musik berhenti sementara saat tab tidak dilihat, lalu lanjut lagi.
  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) {
      if (!audio.paused) { dijedaOtomatis = true; audio.pause(); }
    } else if (dijedaOtomatis) {
      dijedaOtomatis = false;
      if (pengaturan.musik) putar();
    }
  });
}

export function useMusik() {
  return useSyncExternalStore(
    (p) => { pendengar.add(p); return () => pendengar.delete(p); },
    () => potret,
  );
}
