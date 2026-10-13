import { useEffect } from 'react';
import Mulai from './screens/Mulai.jsx';
import PetaLevel from './screens/PetaLevel.jsx';
import Bermain from './screens/Bermain.jsx';
import Dasbor from './screens/Dasbor.jsx';
import Latar from './components/Latar.jsx';
import { Sprite } from './components/Kecil.jsx';
import { FormGantiSandi, ModalMasukLagi } from './components/Akun.jsx';
import { TombolMusik, TombolPengaturan } from './components/Pengaturan.jsx';
import { ambilLevel } from './game/levels.js';
import { cobaSebagaiGuru, keluar, mulaiAplikasi, pindahLayar, selesaiCoba, useToko } from './data/store.js';
import { pasangMusik } from './data/musik.js';

const TEKS_SIMPAN = { tersimpan: 'Tersimpan', menyimpan: 'Menyimpan...', gagal: 'Belum tersimpan' };

export default function App() {
  const layar = useToko((s) => s.layar);
  const akun = useToko((s) => s.akun);
  const mode = useToko((s) => s.mode);
  const tamu = useToko((s) => s.tamu);
  const server = useToko((s) => s.server);
  const simpan = useToko((s) => s.simpan);
  const levelAktif = useToko((s) => s.levelAktif);
  const progres = useToko((s) => s.progres[s.levelAktif]);

  useEffect(() => { mulaiAplikasi(); pasangMusik(); }, []);

  const level = ambilLevel(levelAktif);
  const guru = !!akun && akun.peran === 'guru';
  const bermain = !!mode;

  let isi;
  let namaLayar = layar;
  if (server === null && !akun) { isi = <MemeriksaServer />; namaLayar = 'mulai'; }
  else if (akun && akun.harusGantiSandi) { isi = <LayarGantiSandi />; namaLayar = 'mulai'; }
  else if (guru && (layar === 'dasbor' || !bermain)) { isi = <Dasbor />; namaLayar = 'dasbor'; }
  else if (!bermain) { isi = <Mulai />; namaLayar = 'mulai'; }
  else if (layar === 'main' && progres) isi = <Bermain key={level.id} level={level} progres={progres} />;
  else { isi = <PetaLevel />; namaLayar = 'level'; }

  const nama = akun ? akun.nama : tamu ? tamu.nama : '';
  const wajibGanti = !!akun && akun.harusGantiSandi;
  const sub = akun ? (guru ? 'Guru' : (akun.kelas ? akun.kelas.nama : '')) : tamu ? tamu.kelas : '';

  // Layar bermain memakai tinggi layar penuh (tanpa gulir halaman) di layar laptop dan PC.
  return (
    <div className={`aplikasi layar-${namaLayar}`}>
      <Latar />
      <header className="bilah">
        <button
          type="button"
          className="merek"
          onClick={() => pindahLayar(bermain ? 'level' : guru ? 'dasbor' : 'mulai')}
        >
          <Sprite nama="bit_1" ukuran={36} />
          <span>Jejak Kode</span>
        </button>
        <nav className="bilah-nav" aria-label="Navigasi">
          {nama ? <span className="bilah-siswa">{nama} {sub ? <span>{sub}</span> : null}</span> : null}
          {mode === 'pratinjau' ? (
            <>
              <span className="titik-server coba" title="Progres mode coba tidak disimpan">Mode coba guru</span>
              <button type="button" className="tombol kecil krem" onClick={selesaiCoba}>Kembali ke dasbor</button>
            </>
          ) : null}
          {bermain && !wajibGanti && namaLayar !== 'level' ? (
            <button type="button" className="tombol kecil krem" onClick={() => pindahLayar('level')}>Peta sekolah</button>
          ) : null}
          {guru && !bermain && !wajibGanti ? (
            <button type="button" className="tombol kecil krem" onClick={cobaSebagaiGuru}>Coba game</button>
          ) : null}
          {mode === 'siswa' && !wajibGanti ? (
            <span className={`titik-server simpan-${simpan}`} role="status" title="Status penyimpanan progres ke server">{TEKS_SIMPAN[simpan]}</span>
          ) : null}
          {mode === 'tamu' ? <span className="titik-server" title="Tanpa server: progres hanya tersimpan selama halaman terbuka">Lokal</span> : null}
          {akun || tamu ? <button type="button" className="tautan-bilah" onClick={keluar}>Keluar</button> : null}
          <span className="bilah-ikon">
            <TombolMusik />
            <TombolPengaturan />
          </span>
        </nav>
      </header>
      <main className="konten">{isi}</main>
      <ModalMasukLagi />
    </div>
  );
}

function MemeriksaServer() {
  const bangun = useToko((s) => s.bangun);
  return (
    <div className="layar-tengah">
      <div className="kartu-tengah bingkai-kertas" role="status">
        <Sprite nama="bit_1" ukuran={64} className="peta-bit" />
        <p>{bangun ? 'Server sedang dinyalakan...' : 'Menghubungkan ke server...'}</p>
        {bangun ? (
          <p className="fase-catatan">
            Server tidur kalau lama tidak dipakai. Biasanya siap dalam kurang dari satu menit, tidak perlu memuat ulang halaman.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function LayarGantiSandi() {
  const akun = useToko((s) => s.akun);
  return (
    <div className="layar-tengah">
      <section className="kartu-tengah bingkai-kertas" aria-labelledby="judul-ganti">
        <h1 id="judul-ganti">Buat kata sandi baru</h1>
        <p className="fase-catatan">
          Halo {akun.nama.split(' ')[0]}, kata sandimu baru saja di-reset oleh guru. Buat kata sandi baru yang hanya kamu yang tahu sebelum lanjut.
        </p>
        <FormGantiSandi labelLama="Kata sandi sementara dari guru" />
      </section>
    </div>
  );
}
