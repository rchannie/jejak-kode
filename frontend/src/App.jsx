import { useEffect } from 'react';
import Mulai from './screens/Mulai.jsx';
import PetaLevel from './screens/PetaLevel.jsx';
import Bermain from './screens/Bermain.jsx';
import Dasbor from './screens/Dasbor.jsx';
import Latar from './components/Latar.jsx';
import { Sprite } from './components/Kecil.jsx';
import { TombolMusik, TombolPengaturan } from './components/Pengaturan.jsx';
import { ambilLevel } from './game/levels.js';
import { cekBackend, keluar, pindahLayar, useToko } from './data/store.js';
import { pasangMusik } from './data/musik.js';

export default function App() {
  const layar = useToko((s) => s.layar);
  const siswa = useToko((s) => s.siswa[s.siswaId]);
  const levelAktif = useToko((s) => s.levelAktif);
  const daring = useToko((s) => s.daring);

  useEffect(() => { cekBackend(); pasangMusik(); }, []);

  const level = ambilLevel(levelAktif);
  const progres = siswa && siswa.progres[levelAktif];

  let isi;
  let namaLayar = layar;
  if (layar === 'dasbor') isi = <Dasbor />;
  else if (!siswa || layar === 'mulai') { isi = <Mulai />; namaLayar = 'mulai'; }
  else if (layar === 'main' && progres) isi = <Bermain key={level.id} level={level} progres={progres} />;
  else { isi = <PetaLevel />; namaLayar = 'level'; }

  // Layar bermain memakai tinggi layar penuh (tanpa gulir halaman) di layar laptop dan PC.
  return (
    <div className={`aplikasi layar-${namaLayar}`}>
      <Latar />
      <header className="bilah">
        <button type="button" className="merek" onClick={() => pindahLayar(siswa ? 'level' : 'mulai')}>
          <Sprite nama="bit_1" ukuran={36} />
          <span>Jejak Kode</span>
        </button>
        <nav className="bilah-nav" aria-label="Navigasi">
          {siswa ? (
            <>
              <span className="bilah-siswa">{siswa.nama} <span>{siswa.kelas}</span></span>
              {layar !== 'level' ? <button type="button" className="tombol kecil krem" onClick={() => pindahLayar('level')}>Peta sekolah</button> : null}
            </>
          ) : null}
          {layar !== 'dasbor' ? <button type="button" className="tombol kecil krem" onClick={() => pindahLayar('dasbor')}>Dasbor guru</button> : null}
          {siswa ? <button type="button" className="tautan-bilah" onClick={keluar}>Ganti siswa</button> : null}
          <span className={`titik-server${daring ? ' daring' : ''}`} title={daring ? 'Terhubung ke server' : 'Mode tanpa server'}>
            {daring ? 'Server' : 'Lokal'}
          </span>
          <span className="bilah-ikon">
            <TombolMusik />
            <TombolPengaturan />
          </span>
        </nav>
      </header>
      <main className="konten">{isi}</main>
    </div>
  );
}
