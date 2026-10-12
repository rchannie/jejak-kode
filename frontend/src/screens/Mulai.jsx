import { useState } from 'react';
import AdeganSekolah from '../components/AdeganSekolah.jsx';
import { FASE } from '../game/levels.js';
import { masuk, namaTersimpan, pindahLayar } from '../data/store.js';

export default function Mulai() {
  const lama = namaTersimpan();
  const [nama, setNama] = useState(lama ? lama.nama : '');
  const [kelas, setKelas] = useState(lama ? lama.kelas : 'X PPLG 1');
  const siap = nama.trim().length >= 2 && kelas.trim().length >= 1;

  return (
    <div className="mulai">
      <section className="mulai-panggung">
        <h1 className="mulai-judul" aria-label="Jejak Kode">
          <span>Jejak</span> <span>Kode</span>
        </h1>
        <p className="mulai-sub">Belajar bahasa C bersama Bit, robot piket sekolah</p>
        <div className="bingkai-adegan bingkai-kayu">
          <AdeganSekolah />
        </div>
      </section>

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
        </section>

        <form
          className="mulai-form bingkai-kertas"
          onSubmit={(e) => { e.preventDefault(); if (siap) masuk(nama.trim(), kelas.trim()); }}
        >
          <h2>Masuk sebagai siswa</h2>
          <label className="isian" htmlFor="nama-siswa">
            <span>Nama</span>
            <input id="nama-siswa" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap" autoComplete="name" />
          </label>
          <label className="isian" htmlFor="kelas-siswa">
            <span>Kelas</span>
            <input id="kelas-siswa" value={kelas} onChange={(e) => setKelas(e.target.value)} placeholder="Contoh: X PPLG 1" />
          </label>
          <button type="submit" className="tombol besar" disabled={!siap}>Mulai belajar</button>
          <div className="pemisah" aria-hidden="true" />
          <button type="button" className="tombol krem" onClick={() => pindahLayar('dasbor')}>Buka dasbor guru</button>
          <p className="fase-catatan">Dasbor guru menampilkan tebakan, percobaan, dan temuan setiap siswa.</p>
        </form>
      </div>
    </div>
  );
}
