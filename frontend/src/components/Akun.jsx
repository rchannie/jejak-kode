import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sprite } from './Kecil.jsx';
import { gantiSandi, keluar, masuk, useToko } from '../data/store.js';

// Kolom isian bergaya pixel yang dipakai di form akun.
export function Isian({ label, keterangan, ...props }) {
  return (
    <label className="isian">
      <span>{label}</span>
      <input {...props} />
      {keterangan ? <small className="isian-ket">{keterangan}</small> : null}
    </label>
  );
}

// Username selalu huruf kecil tanpa spasi.
export const rapikanUsername = (v) => v.toLowerCase().replace(/\s+/g, '');

export function FormGantiSandi({ labelLama = 'Kata sandi lama', selesai }) {
  const akun = useToko((s) => s.akun);
  const minimal = akun && akun.peran === 'guru' ? 8 : 6;
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [ulang, setUlang] = useState('');
  const [pesan, setPesan] = useState(null);
  const [proses, setProses] = useState(false);

  async function kirim(e) {
    e.preventDefault();
    if (baru.length < minimal) { setPesan({ salah: true, teks: `Kata sandi baru minimal ${minimal} karakter.` }); return; }
    if (baru !== ulang) { setPesan({ salah: true, teks: 'Ulangi kata sandi baru dengan tepat.' }); return; }
    setProses(true);
    const r = await gantiSandi(lama, baru);
    setProses(false);
    if (!r.ok) { setPesan({ salah: true, teks: r.pesan }); return; }
    setLama(''); setBaru(''); setUlang('');
    setPesan({ salah: false, teks: 'Kata sandi sudah diganti.' });
    if (selesai) selesai();
  }

  return (
    <form className="form-akun" onSubmit={kirim}>
      <Isian label={labelLama} type="password" value={lama} onChange={(e) => setLama(e.target.value)} autoComplete="current-password" required />
      <Isian label="Kata sandi baru" type="password" value={baru} onChange={(e) => setBaru(e.target.value)} autoComplete="new-password" keterangan={`Minimal ${minimal} karakter.`} required />
      <Isian label="Ulangi kata sandi baru" type="password" value={ulang} onChange={(e) => setUlang(e.target.value)} autoComplete="new-password" required />
      {pesan ? <p className={`vonis ${pesan.salah ? 'salah' : 'benar'}`} role="status">{pesan.teks}</p> : null}
      <button type="submit" className="tombol" disabled={proses}>{proses ? 'Menyimpan...' : 'Simpan kata sandi'}</button>
    </form>
  );
}

// Muncul jika sesi berakhir di tengah permainan. Progres yang belum terkirim
// tetap ada di memori dan dikirim ulang setelah siswa masuk lagi.
export function ModalMasukLagi() {
  const sesiHabis = useToko((s) => s.sesiHabis);
  const akun = useToko((s) => s.akun);
  const [sandi, setSandi] = useState('');
  const [pesan, setPesan] = useState('');
  const [proses, setProses] = useState(false);
  if (!sesiHabis || !akun) return null;

  async function kirim(e) {
    e.preventDefault();
    setProses(true);
    const r = await masuk(akun.username, sandi);
    setProses(false);
    if (!r.ok) setPesan(r.pesan);
    else setSandi('');
  }

  return createPortal(
    <div className="lapis-modal">
      <section className="panel-atur bingkai-kertas" role="dialog" aria-modal="true" aria-labelledby="judul-masuk-lagi">
        <div className="panel-atur-kepala">
          <Sprite nama="bit_bingung" ukuran={40} />
          <h2 id="judul-masuk-lagi">Masuk lagi, ya</h2>
        </div>
        <p>Sesimu sudah berakhir. Masukkan kata sandi supaya progresmu tetap tersimpan.</p>
        <form className="form-akun" onSubmit={kirim}>
          <Isian label="Username" value={akun.username} readOnly />
          <Isian label="Kata sandi" type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="current-password" autoFocus required />
          {pesan ? <p className="vonis salah" role="status">{pesan}</p> : null}
          <div className="fase-aksi">
            <button type="submit" className="tombol" disabled={proses}>{proses ? 'Memeriksa...' : 'Masuk'}</button>
            <button type="button" className="tautan-teks" onClick={keluar}>Keluar tanpa menyimpan</button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
