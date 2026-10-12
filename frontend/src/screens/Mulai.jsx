import { useState } from 'react';
import AdeganSekolah from '../components/AdeganSekolah.jsx';
import { Isian, rapikanUsername } from '../components/Akun.jsx';
import { FASE } from '../game/levels.js';
import { daftarGuru, daftarSiswa, mainTamu, masuk, namaTersimpan, useToko } from '../data/store.js';

export default function Mulai() {
  const server = useToko((s) => s.server);
  return (
    <div className="mulai">
      <div className="mulai-atas">
      <section className="mulai-panggung">
        <h1 className="mulai-judul" aria-label="Jejak Kode">
          <span>Jejak</span> <span>Kode</span>
        </h1>
        <p className="mulai-sub">Belajar bahasa C bersama Bit, robot piket sekolah</p>
        <div className="bingkai-adegan bingkai-kayu">
          <AdeganSekolah />
        </div>
      </section>
        {server ? <PanelAkun /> : <PanelTamu />}
      </div>

      <div className="mulai-bawah">
        <section className="mulai-cerita bingkai-kertas">
          <p className="mulai-lead">
            Bit siap membersihkan lorong, mencatat cahaya kelas, merawat taman, mengatur lampu, dan mengantar buku.
            Semua perintahnya kamu tulis dalam bahasa C, lalu kamu bisa melihat Bit menjalankannya satu baris demi satu baris.
          </p>
          <h2>Setiap level berjalan dalam lima fase</h2>
          <ol className="mulai-alur">
            {FASE.map((f) => (
              <li key={f.id}><b>{f.nama}</b><span>{f.ringkas}</span></li>
            ))}
          </ol>
          <p className="fase-catatan">Jawabanmu di setiap fase tercatat di LKPD (Lembar Kerja Peserta Didik) level tersebut.</p>
        </section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ dengan server: masuk dan daftar
function PanelAkun() {
  const info = useToko((s) => s.info);
  const [tab, setTab] = useState('masuk');
  const tabs = [['masuk', 'Masuk'], ['siswa', 'Daftar siswa']];
  if (info.daftarGuru || tab === 'guru') tabs.push(['guru', 'Daftar guru']);
  return (
    <section className="mulai-form bingkai-kertas" aria-label="Akun">
      <div className="tab-akun" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`tab-akun-tombol${tab === id ? ' aktif' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'masuk' ? <FormMasuk keDaftar={() => setTab('siswa')} /> : null}
      {tab === 'siswa' ? <FormDaftarSiswa /> : null}
      {tab === 'guru' ? <FormDaftarGuru /> : null}
    </section>
  );
}

function Pesan({ teks }) {
  return teks ? <p className="vonis salah" role="alert">{teks}</p> : null;
}

function FormMasuk({ keDaftar }) {
  const [username, setUsername] = useState('');
  const [sandi, setSandi] = useState('');
  const [pesan, setPesan] = useState('');
  const [proses, setProses] = useState(false);
  async function kirim(e) {
    e.preventDefault();
    setProses(true);
    setPesan('');
    const r = await masuk(username, sandi);
    setProses(false);
    if (!r.ok) setPesan(r.pesan);
  }
  return (
    <form className="form-akun" onSubmit={kirim}>
      <h2>Masuk</h2>
      <Isian label="Username" value={username} onChange={(e) => setUsername(rapikanUsername(e.target.value))} autoComplete="username" autoCapitalize="none" spellCheck={false} required />
      <Isian label="Kata sandi" type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="current-password" required />
      <Pesan teks={pesan} />
      <button type="submit" className="tombol besar" disabled={proses || !username || !sandi}>{proses ? 'Memeriksa...' : 'Masuk'}</button>
      <p className="fase-catatan">
        Belum punya akun? <button type="button" className="tautan-teks" onClick={keDaftar}>Daftar dengan kode kelas</button>.
        Lupa kata sandi? Minta guru me-reset dari dasbor guru.
      </p>
    </form>
  );
}

function FormDaftarSiswa() {
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [sandi, setSandi] = useState('');
  const [ulang, setUlang] = useState('');
  const [kode, setKode] = useState('');
  const [pesan, setPesan] = useState('');
  const [proses, setProses] = useState(false);
  async function kirim(e) {
    e.preventDefault();
    if (sandi.length < 6) { setPesan('Kata sandi minimal 6 karakter.'); return; }
    if (sandi !== ulang) { setPesan('Ulangi kata sandi dengan tepat.'); return; }
    setProses(true);
    setPesan('');
    const r = await daftarSiswa({ nama, username, sandi, kodeKelas: kode });
    setProses(false);
    if (!r.ok) setPesan(r.pesan);
  }
  return (
    <form className="form-akun" onSubmit={kirim}>
      <h2>Daftar akun siswa</h2>
      <Isian label="Kode kelas dari guru" value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} placeholder="Contoh: K7Q-2MX" autoCapitalize="characters" spellCheck={false} required />
      <Isian label="Nama lengkap" value={nama} onChange={(e) => setNama(e.target.value)} autoComplete="name" required />
      <Isian
        label="Username"
        value={username}
        onChange={(e) => setUsername(rapikanUsername(e.target.value))}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        keterangan="Huruf kecil, angka, titik, atau garis bawah. Contoh: raka.pratama"
        required
      />
      <div className="isian-dua">
        <Isian label="Kata sandi" type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="new-password" keterangan="Minimal 6 karakter." required />
        <Isian label="Ulangi kata sandi" type="password" value={ulang} onChange={(e) => setUlang(e.target.value)} autoComplete="new-password" required />
      </div>
      <Pesan teks={pesan} />
      <button type="submit" className="tombol besar" disabled={proses}>{proses ? 'Mendaftarkan...' : 'Daftar dan mulai belajar'}</button>
      <p className="fase-catatan">Ingat username dan kata sandimu. Kamu memakainya setiap kali masuk, dari komputer mana pun.</p>
    </form>
  );
}

function FormDaftarGuru() {
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [sandi, setSandi] = useState('');
  const [ulang, setUlang] = useState('');
  const [kode, setKode] = useState('');
  const [pesan, setPesan] = useState('');
  const [proses, setProses] = useState(false);
  async function kirim(e) {
    e.preventDefault();
    if (sandi.length < 8) { setPesan('Kata sandi guru minimal 8 karakter.'); return; }
    if (sandi !== ulang) { setPesan('Ulangi kata sandi dengan tepat.'); return; }
    setProses(true);
    setPesan('');
    const r = await daftarGuru({ nama, username, sandi, kodeGuru: kode });
    setProses(false);
    if (!r.ok) setPesan(r.pesan);
  }
  return (
    <form className="form-akun" onSubmit={kirim}>
      <h2>Daftar akun guru</h2>
      <p className="fase-catatan">Butuh kode pendaftaran guru dari pengelola server. Siswa tidak bisa membuat akun guru.</p>
      <Isian label="Kode pendaftaran guru" type="password" value={kode} onChange={(e) => setKode(e.target.value)} autoComplete="off" required />
      <Isian label="Nama lengkap" value={nama} onChange={(e) => setNama(e.target.value)} autoComplete="name" required />
      <Isian label="Username" value={username} onChange={(e) => setUsername(rapikanUsername(e.target.value))} autoComplete="username" autoCapitalize="none" spellCheck={false} required />
      <div className="isian-dua">
        <Isian label="Kata sandi" type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="new-password" keterangan="Minimal 8 karakter." required />
        <Isian label="Ulangi kata sandi" type="password" value={ulang} onChange={(e) => setUlang(e.target.value)} autoComplete="new-password" required />
      </div>
      <Pesan teks={pesan} />
      <button type="submit" className="tombol besar" disabled={proses}>{proses ? 'Mendaftarkan...' : 'Daftar sebagai guru'}</button>
    </form>
  );
}

// ------------------------------------------------------------------ tanpa server: main sebagai tamu
function PanelTamu() {
  const lama = namaTersimpan();
  const [nama, setNama] = useState(lama ? lama.nama : '');
  const [kelas, setKelas] = useState(lama ? lama.kelas : 'X PPLG 1');
  const siap = nama.trim().length >= 2 && kelas.trim().length >= 1;
  return (
    <form
      className="mulai-form bingkai-kertas"
      onSubmit={(e) => { e.preventDefault(); if (siap) mainTamu(nama.trim(), kelas.trim()); }}
    >
      <h2>Main tanpa akun</h2>
      <p className="fase-catatan">
        Server sekolah tidak terhubung, jadi akun, dasbor guru, dan penyimpanan progres tidak tersedia.
        Progres hanya tersimpan selama halaman ini terbuka.
      </p>
      <Isian label="Nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap" autoComplete="name" />
      <Isian label="Kelas" value={kelas} onChange={(e) => setKelas(e.target.value)} placeholder="Contoh: X PPLG 1" />
      <button type="submit" className="tombol besar" disabled={!siap}>Mulai belajar</button>
    </form>
  );
}
