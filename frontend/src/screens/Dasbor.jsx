import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sprite } from '../components/Kecil.jsx';
import { LEVEL } from '../game/levels.js';
import { api, keluar, useToko } from '../data/store.js';
import TabRingkasan from './dasbor/Ringkasan.jsx';
import TabSiswa from './dasbor/Siswa.jsx';
import TabLkpd from './dasbor/Lkpd.jsx';
import { alasanDampingi, buatCsv, menitLalu, unduh } from './dasbor/olah.js';
import { TombolYakin, kodeTampil } from './dasbor/Umum.jsx';

const JEDA_MUAT = 15000;
export default function Dasbor() {
  const akun = useToko((s) => s.akun);
  const [daftar, setDaftar] = useState(null);
  const [kelasId, setKelasId] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('ringkasan');
  const [siswaPilih, setSiswaPilih] = useState(null);
  const [pesan, setPesan] = useState('');
  const [memuat, setMemuat] = useState(false);

  const tangani = useCallback((r) => {
    if (r.status === 401) { keluar(); return false; }
    if (!r.ok) { setPesan(r.pesan); return false; }
    setPesan('');
    return true;
  }, []);

  const muatDaftar = useCallback(async (pilih) => {
    const r = await api('/guru/kelas');
    if (!tangani(r)) return;
    setDaftar(r.data.kelas);
    setKelasId((lama) => {
      if (pilih) return pilih;
      if (lama && r.data.kelas.some((k) => k.id === lama)) return lama;
      return r.data.kelas[0] ? r.data.kelas[0].id : null;
    });
  }, [tangani]);

  const muatKelas = useCallback(async () => {
    if (!kelasId) { setData(null); return; }
    setMemuat(true);
    const r = await api(`/guru/kelas/${kelasId}/siswa`);
    setMemuat(false);
    if (tangani(r)) setData(r.data);
  }, [kelasId, tangani]);

  useEffect(() => { muatDaftar(); }, [muatDaftar]);
  useEffect(() => {
    setData(null);
    setSiswaPilih(null);
    muatKelas();
    const t = setInterval(() => { if (document.visibilityState === 'visible') muatKelas(); }, JEDA_MUAT);
    return () => clearInterval(t);
  }, [muatKelas]);

  const siswa = data ? data.siswa : [];
  const dampingi = useMemo(() => siswa.flatMap((s) => LEVEL.map((l) => ({ s, l, alasan: alasanDampingi(s.progres[l.id]) })))
    .filter((x) => x.alasan.length), [siswa]);
  const aktif = siswa.filter((s) => { const m = menitLalu(s.terakhirAktif, data && data.sekarang); return m !== null && m < 2; }).length;
  const rataSelesai = siswa.length
    ? (siswa.reduce((a, s) => a + LEVEL.filter((l) => s.progres[l.id] && s.progres[l.id].selesai).length, 0) / siswa.length)
    : 0;

  function bukaSiswa(id) { setSiswaPilih(id); setTab('siswa'); }

  return (
    <div className="dasbor">
      <header className="dasbor-kepala bingkai-kertas">
        <div>
          <h1>Dasbor guru</h1>
          <p className="fase-catatan">{akun ? `${akun.nama} · ` : ''}Data kelas diperbarui otomatis setiap 15 detik.</p>
        </div>
        <div className="dasbor-tombol">
          <button type="button" className="tombol krem" onClick={() => { muatDaftar(); muatKelas(); }} disabled={memuat}>
            {memuat ? 'Memuat...' : 'Muat ulang'}
          </button>
        </div>
      </header>

      {pesan ? <p className="vonis salah" role="alert">{pesan}</p> : null}

      {daftar === null ? <p className="fase-catatan">Memuat kelas...</p> : null}
      {daftar && daftar.length === 0 ? <KelasPertama selesai={(id) => muatDaftar(id)} tangani={tangani} /> : null}

      {daftar && daftar.length ? (
        <>
          <nav className="pilih-kelas" aria-label="Pilih kelas">
            {daftar.map((k) => (
              <button
                key={k.id}
                type="button"
                className={`chip-kelas${k.id === kelasId ? ' aktif' : ''}`}
                aria-pressed={k.id === kelasId}
                onClick={() => setKelasId(k.id)}
              >
                {k.nama} <span>{k.jumlahSiswa} siswa</span>
              </button>
            ))}
            <BuatKelas selesai={(id) => muatDaftar(id)} tangani={tangani} />
          </nav>

          {data ? (
            <>
              <PanelKelas
                kelas={data.kelas}
                ringkas={{ jumlah: siswa.length, aktif, rataSelesai, dampingi: new Set(dampingi.map((x) => x.s.id)).size }}
                ubah={async (isi) => { const r = await api(`/guru/kelas/${kelasId}`, { metode: 'PATCH', isi }); if (tangani(r)) { muatDaftar(); muatKelas(); } }}
                hapus={async () => { const r = await api(`/guru/kelas/${kelasId}`, { metode: 'DELETE' }); if (tangani(r)) { setKelasId(null); muatDaftar(); } }}
              />

              <div className="dasbor-tab" role="tablist" aria-label="Bagian dasbor">
                {[['ringkasan', 'Ringkasan kelas'], ['siswa', 'Siswa'], ['lkpd', 'LKPD']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    className={`tab-akun-tombol${tab === id ? ' aktif' : ''}`}
                    onClick={() => { setTab(id); if (id !== 'siswa') setSiswaPilih(null); }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className="tombol kecil krem dasbor-unduh"
                  disabled={!siswa.length}
                  onClick={() => unduh(`jejak-kode-${data.kelas.nama.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`, buatCsv(data.kelas, siswa))}
                >
                  Unduh data (CSV)
                </button>
              </div>

              {siswa.length === 0 ? (
                <div className="kosong bingkai-kertas">
                  <h2>Belum ada siswa di kelas ini</h2>
                  <p>
                    Minta siswa membuka game, memilih <b>Daftar siswa</b>, lalu memasukkan kode kelas <b>{kodeTampil(data.kelas.kode)}</b>.
                    Tekan <b>Tampilkan di layar</b> untuk menampilkan kodenya besar-besar di proyektor.
                  </p>
                </div>
              ) : null}

              {siswa.length && tab === 'ringkasan' ? <TabRingkasan siswa={siswa} dampingi={dampingi} bukaSiswa={bukaSiswa} /> : null}
              {siswa.length && tab === 'siswa' ? (
                <TabSiswa
                  data={data}
                  daftarKelas={daftar}
                  siswaPilih={siswaPilih}
                  setSiswaPilih={setSiswaPilih}
                  tangani={tangani}
                  muatUlang={() => { muatKelas(); muatDaftar(); }}
                />
              ) : null}
              {siswa.length && tab === 'lkpd' ? <TabLkpd data={data} /> : null}
            </>
          ) : <p className="fase-catatan">Memuat data kelas...</p>}
        </>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ kelas
function KelasPertama({ selesai, tangani }) {
  return (
    <section className="kosong bingkai-kertas">
      <h2>Buat kelas pertama Anda</h2>
      <p>Setiap kelas punya kode sendiri. Siswa mendaftar dengan kode itu, lalu progres dan LKPD mereka muncul di dasbor ini.</p>
      <BuatKelas selesai={selesai} tangani={tangani} terbuka />
    </section>
  );
}

function BuatKelas({ selesai, tangani, terbuka = false }) {
  const [buka, setBuka] = useState(terbuka);
  const [nama, setNama] = useState('');
  const [proses, setProses] = useState(false);
  if (!buka) return <button type="button" className="chip-kelas tambah" onClick={() => setBuka(true)}>+ Kelas baru</button>;
  return (
    <form
      className="form-baris"
      onSubmit={async (e) => {
        e.preventDefault();
        setProses(true);
        const r = await api('/guru/kelas', { metode: 'POST', isi: { nama } });
        setProses(false);
        if (tangani(r)) { setNama(''); if (!terbuka) setBuka(false); selesai(r.data.kelas.id); }
      }}
    >
      <label className="isian">
        <span className="sr">Nama kelas</span>
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama kelas, misalnya X PPLG 1" autoFocus required />
      </label>
      <button type="submit" className="tombol kecil" disabled={proses || !nama.trim()}>Buat kelas</button>
      {!terbuka ? <button type="button" className="tombol kecil krem" onClick={() => setBuka(false)}>Batal</button> : null}
    </form>
  );
}

function PanelKelas({ kelas, ringkas, ubah, hapus }) {
  const [layar, setLayar] = useState(false);
  const [ubahNama, setUbahNama] = useState(false);
  const [nama, setNama] = useState(kelas.nama);
  useEffect(() => { setNama(kelas.nama); }, [kelas.nama]);
  return (
    <section className="panel-kelas bingkai-kertas" aria-label={`Kelas ${kelas.nama}`}>
      <div className="panel-kelas-kode">
        <p className="label-kecil">Kode kelas {kelas.nama}</p>
        <p className="kode-besar">{kodeTampil(kelas.kode)}</p>
        <div className="baris-tombol">
          <button type="button" className="tombol kecil" onClick={() => setLayar(true)}>Tampilkan di layar</button>
          <TombolYakin label="Ganti kode" tanya="Kode lama tidak berlaku lagi." ya="Ganti" aksi={() => ubah({ kodeBaru: true })} />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={kelas.pendaftaranDibuka}
          className={`saklar${kelas.pendaftaranDibuka ? ' nyala' : ''}`}
          onClick={() => ubah({ pendaftaranDibuka: !kelas.pendaftaranDibuka })}
        >
          <span className="saklar-tuas" aria-hidden="true" />
          <span className="saklar-teks">{kelas.pendaftaranDibuka ? 'Pendaftaran dibuka' : 'Pendaftaran ditutup'}</span>
        </button>
      </div>

      <dl className="angka-kelas">
        <div><dt>Siswa terdaftar</dt><dd>{ringkas.jumlah}</dd></div>
        <div><dt>Aktif sekarang</dt><dd>{ringkas.aktif}</dd></div>
        <div><dt>Rata-rata level selesai</dt><dd>{ringkas.rataSelesai.toFixed(1)}<span>/{LEVEL.length}</span></dd></div>
        <div className={ringkas.dampingi ? 'awas' : ''}><dt>Perlu didampingi</dt><dd>{ringkas.dampingi}</dd></div>
      </dl>

      <div className="panel-kelas-atur">
        {ubahNama ? (
          <form className="form-baris" onSubmit={(e) => { e.preventDefault(); ubah({ nama }); setUbahNama(false); }}>
            <label className="isian"><span className="sr">Nama kelas</span><input value={nama} onChange={(e) => setNama(e.target.value)} required autoFocus /></label>
            <button type="submit" className="tombol kecil">Simpan</button>
            <button type="button" className="tombol kecil krem" onClick={() => setUbahNama(false)}>Batal</button>
          </form>
        ) : (
          <button type="button" className="tautan-teks" onClick={() => setUbahNama(true)}>Ubah nama kelas</button>
        )}
        {ringkas.jumlah === 0 ? (
          <TombolYakin label="Hapus kelas" kelas="tautan-teks" tanya="Hapus kelas ini?" ya="Hapus" aksi={hapus} />
        ) : null}
      </div>

      {layar ? <KodeDiLayar kelas={kelas} tutup={() => setLayar(false)} /> : null}
    </section>
  );
}

// Tampilan kode kelas besar untuk proyektor kelas.
function KodeDiLayar({ kelas, tutup }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') tutup(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [tutup]);
  return createPortal(
    <div className="lapis-modal layar-kode" onMouseDown={(e) => { if (e.target === e.currentTarget) tutup(); }}>
      <div className="kartu-layar-kode bingkai-kertas" role="dialog" aria-modal="true" aria-label="Kode kelas">
        <Sprite nama="bit_senang" ukuran={96} className="peta-bit" />
        <p className="layar-kode-kelas">{kelas.nama}</p>
        <ol>
          <li>Buka <b>{window.location.host}</b> di browser</li>
          <li>Pilih <b>Daftar siswa</b></li>
          <li>Masukkan kode kelas:</li>
        </ol>
        <p className="kode-raksasa">{kodeTampil(kelas.kode)}</p>
        {!kelas.pendaftaranDibuka ? <p className="vonis salah">Pendaftaran kelas ini sedang ditutup.</p> : null}
        <button type="button" className="tombol" onClick={tutup} autoFocus>Tutup</button>
      </div>
    </div>,
    document.body,
  );
}
