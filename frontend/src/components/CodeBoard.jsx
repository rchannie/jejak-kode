import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Papan tulis tempat kode C ditulis. Kode diwarnai seperti kapur warna-warni,
// baris yang sedang dijalankan disorot kuning, baris bermasalah disorot merah.
//
// Susunan lapisan: textarea transparan diletakkan tepat di atas lapisan sorot.
// Keduanya berada di dalam satu wadah gulir (.papan-tulis), sehingga textarea
// tidak pernah menggulir sendiri. Dengan begitu kursor selalu sejajar dengan
// huruf yang terlihat.
//
// Di layar laptop dan PC tinggi papan dibatasi (layar bermain tidak bergulir),
// jadi .papan-badan menjadi wadah gulir tegak. Baris yang sedang dijalankan
// dan baris tempat kursor berada selalu digulir supaya terlihat.

const KATA_KUNCI = /^(int|float|double|char|void|long|short|unsigned|bool|if|else|for|while|do|return|break|continue|true|false)$/;
const PERINTAH_BIT = /^(maju|siram|cek_kelembapan|nyalakan_lampu|matikan_lampu|cek_cahaya|ambil_buku|taruh_buku|ada_sampah|pungut|printf|main)$/;

function warnai(teks) {
  if (/^\s*#/.test(teks)) return [<span key="0" className="k-pp">{teks}</span>];
  const potong = [];
  const pola = /(\/\/.*$)|("(?:[^"\\]|\\.)*"?)|('(?:[^'\\]|\\.)*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_\d"']+)/g;
  let m;
  let i = 0;
  while ((m = pola.exec(teks))) {
    const [isi, komen, str, chr, angka, kata] = m;
    let kelas = '';
    if (komen) kelas = 'k-komen';
    else if (str || chr) kelas = 'k-teks';
    else if (angka) kelas = 'k-angka';
    else if (kata && KATA_KUNCI.test(kata)) kelas = 'k-kunci';
    else if (kata && PERINTAH_BIT.test(kata)) kelas = 'k-fungsi';
    else if (/^[{}()]+$/.test(isi)) kelas = 'k-kurung';
    potong.push(kelas ? <span key={i++} className={kelas}>{isi}</span> : isi);
  }
  return potong;
}

// Lebar satu huruf pada font kode (font monospace, jadi semua huruf sama lebar).
let kanvasUkur = null;
function lebarHuruf(el) {
  try {
    const gaya = getComputedStyle(el);
    if (!kanvasUkur) kanvasUkur = document.createElement('canvas').getContext('2d');
    kanvasUkur.font = `${gaya.fontSize} ${gaya.fontFamily}`;
    return kanvasUkur.measureText('0').width || 9;
  } catch {
    return 9;
  }
}

// Gulir wadah tegak seperlunya supaya rentang [atas, bawah] terlihat.
function tampakkanTegak(badan, atas, bawah) {
  if (!badan || badan.scrollHeight <= badan.clientHeight) return;
  const jarak = 8;
  if (atas < badan.scrollTop + jarak) badan.scrollTop = Math.max(0, atas - jarak);
  else if (bawah > badan.scrollTop + badan.clientHeight - jarak) badan.scrollTop = bawah - badan.clientHeight + jarak;
}

export default function CodeBoard({ kode, onUbah, bisaEdit, barisAktif, barisGalat, judul, kaki, isiBitH, reset = null, id = 'papan-kode' }) {
  const badan = useRef(null);
  const wadah = useRef(null);
  const input = useRef(null);
  const sudahFokus = useRef(false);
  const [dipilih, setDipilih] = useState(null);
  // Semua baris ditampilkan, termasuk baris kosong terakhir, supaya tinggi
  // lapisan sorot selalu sama dengan isi textarea.
  const baris = kode.split('\n');

  // Pastikan kursor tetap terlihat saat baris lebih panjang dari papan.
  function tampakkanKursor() {
    const t = input.current;
    const w = wadah.current;
    if (!t || !w || document.activeElement !== t) return;
    const pos = t.selectionEnd;
    const kolom = pos - (t.value.lastIndexOf('\n', pos - 1) + 1);
    const x = 8 + kolom * lebarHuruf(t);
    const kiri = w.scrollLeft;
    const lebar = w.clientWidth;
    if (x < kiri + 24) w.scrollLeft = Math.max(0, x - 48);
    else if (x > kiri + lebar - 24) w.scrollLeft = x - lebar + 48;
    // arah tegak: baris tempat kursor berada
    const tinggi = parseFloat(getComputedStyle(t).lineHeight) || 28;
    const nomorBaris = t.value.slice(0, pos).split('\n').length - 1;
    const atas = 6 + nomorBaris * tinggi;
    tampakkanTegak(badan.current, atas, atas + tinggi);
  }

  // Baris yang sedang dijalankan (atau baris bermasalah) digulir supaya terlihat.
  // Ukuran papan bisa berubah (misalnya teks bantuan bit.h berganti), jadi
  // pemeriksaan diulang setiap kali tinggi papan berubah.
  const barisSorot = barisGalat || barisAktif;
  const sorotRef = useRef(barisSorot);
  sorotRef.current = barisSorot;
  function tampakkanSorot() {
    const b = badan.current;
    const n = sorotRef.current;
    if (!b || !n) return;
    const el = b.querySelector(`.papan-sorot > .baris:nth-child(${n})`);
    if (el) tampakkanTegak(b, el.offsetTop, el.offsetTop + el.offsetHeight);
  }
  useEffect(tampakkanSorot, [barisSorot, kode]);
  useEffect(() => {
    const b = badan.current;
    if (!b || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => tampakkanSorot());
    ro.observe(b);
    return () => ro.disconnect();
  }, []);

  // Papan berganti isi (misalnya pindah ke misi tulis sendiri): mulai dari atas.
  useLayoutEffect(() => { if (badan.current) badan.current.scrollTop = 0; }, [judul]);

  // Textarea tidak boleh menggulir sendiri. Jika browser sempat menggulirnya
  // (misalnya sesaat sebelum baris baru digambar), kembalikan ke nol.
  function jagaGulir(e) {
    const t = e.currentTarget;
    if (t.scrollTop || t.scrollLeft) {
      requestAnimationFrame(() => {
        t.scrollTop = 0;
        t.scrollLeft = 0;
        tampakkanKursor();
      });
    }
  }

  // Posisi kursor yang harus dipasang setelah kode baru selesai digambar.
  // Dipasang di useLayoutEffect (bukan setelah frame berikutnya) supaya
  // ketikan cepat setelah Enter atau Tab tidak meloncat ke akhir kode.
  const kursorTertunda = useRef(null);

  // Papan berganti tahap (misalnya dari perbaikan ke tulis sendiri).
  useLayoutEffect(() => { sudahFokus.current = false; }, [judul]);

  useLayoutEffect(() => {
    const t = input.current;
    if (!t) return;
    if (kursorTertunda.current !== null) {
      t.selectionStart = t.selectionEnd = kursorTertunda.current;
      kursorTertunda.current = null;
    }
    if (t.scrollTop || t.scrollLeft) { t.scrollTop = 0; t.scrollLeft = 0; }
    tampakkanKursor();
  }, [kode]);

  function ganti(teksBaru, posisi) {
    kursorTertunda.current = posisi;
    onUbah(teksBaru);
  }

  function sisip(el, teks, a, b, posisi) {
    const v = el.value;
    ganti(v.slice(0, a) + teks + v.slice(b), posisi);
  }

  // Menyisipkan contoh perintah bit.h sebagai baris baru di dekat kursor.
  function sisipPerintah(teks) {
    const t = input.current;
    if (!t || !bisaEdit) return;
    const v = t.value;
    const pernahFokus = sudahFokus.current;
    t.focus();
    const r = v.lastIndexOf('return 0;');
    const bukaMain = v.indexOf('{', Math.max(0, v.indexOf('main')));
    const diLuarMain = (r >= 0 && t.selectionStart > r) || (bukaMain >= 0 && t.selectionStart <= bukaMain);
    if (!pernahFokus || diLuarMain) {
      // Belum pernah mengetik, atau kursor di luar main(): taruh tepat sebelum "return 0;".
      const awal = r >= 0 ? v.lastIndexOf('\n', r - 1) + 1 : v.length;
      const jorok = r >= 0 ? v.slice(awal, r) : '    ';
      const baru = `${jorok}${teks}\n`;
      sudahFokus.current = true;
      ganti(v.slice(0, awal) + baru + v.slice(awal), awal + baru.length - 1);
      return;
    }
    const a = t.selectionStart;
    const b = t.selectionEnd;
    const awalBaris = v.lastIndexOf('\n', a - 1) + 1;
    let akhirBaris = v.indexOf('\n', b);
    if (akhirBaris === -1) akhirBaris = v.length;
    const isiBaris = v.slice(awalBaris, akhirBaris);
    const jorokBaris = isiBaris.match(/^ */)[0];
    if (!isiBaris.trim()) {
      // Baris kosong: pakai jorok baris berisi di atasnya.
      const atas = v.slice(0, awalBaris).split('\n').reverse().find((s) => s.trim()) || '';
      const jorok = atas.match(/^ */)[0] + (atas.trimEnd().endsWith('{') ? '    ' : '');
      const baru = `${jorok}${teks}`;
      ganti(v.slice(0, awalBaris) + baru + v.slice(akhirBaris), awalBaris + baru.length);
    } else if (!v.slice(awalBaris, a).trim()) {
      // Kursor di depan isi baris: sisipkan sebagai baris baru di atasnya.
      const baru = `${jorokBaris}${teks}\n`;
      ganti(v.slice(0, awalBaris) + baru + v.slice(awalBaris), awalBaris + baru.length - 1);
    } else {
      // Kursor di tengah atau akhir baris: sisipkan sebagai baris baru di bawahnya.
      const jorok = jorokBaris + (isiBaris.trimEnd().endsWith('{') ? '    ' : '');
      const baru = `\n${jorok}${teks}`;
      ganti(v.slice(0, akhirBaris) + baru + v.slice(akhirBaris), akhirBaris + baru.length);
    }
  }

  function tombol(e) {
    if (!bisaEdit) return;
    const el = e.target;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const awalBaris = value.lastIndexOf('\n', a - 1) + 1;
    const sebelum = value.slice(awalBaris, a);
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        const n = (value.slice(awalBaris, awalBaris + 4).match(/^ {1,4}/) || [''])[0].length;
        if (n) ganti(value.slice(0, awalBaris) + value.slice(awalBaris + n), Math.max(awalBaris, a - n));
        return;
      }
      sisip(el, '    ', a, b, a + 4);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      let jorok = sebelum.match(/^ */)[0];
      const sesudah = value.slice(b, value.indexOf('\n', b) === -1 ? value.length : value.indexOf('\n', b));
      if (sebelum.trimEnd().endsWith('{')) {
        const dalam = `${jorok}    `;
        if (sesudah.trim().startsWith('}')) {
          sisip(el, `\n${dalam}\n${jorok}`, a, b, a + 1 + dalam.length);
          return;
        }
        jorok = dalam;
      }
      sisip(el, `\n${jorok}`, a, b, a + 1 + jorok.length);
    } else if (e.key === '}' && /^ +$/.test(sebelum) && sebelum.length >= 4) {
      e.preventDefault();
      const baru = sebelum.slice(4);
      ganti(value.slice(0, awalBaris) + baru + '}' + value.slice(b), awalBaris + baru.length + 1);
    }
  }

  return (
    <section className="papan bingkai-papan" aria-label="Papan kode">
      <header className="papan-kepala">
        <span className="papan-judul">{judul}</span>
        {bisaEdit && reset ? (
          <button type="button" className="tautan-kapur" onClick={reset.aksi}>{reset.label}</button>
        ) : (
          <span className="papan-status">{bisaEdit ? 'Bisa ditulis' : 'Hanya dibaca'}</span>
        )}
      </header>
      {isiBitH ? (
        // Strip isi bit.h dibuat satu sampai dua baris saja. Penjelasan perintah
        // muncul sebagai tip melayang saat perintah disorot, jadi tidak
        // memakan tempat papan kode.
        <div className="papan-bith" onMouseLeave={() => setDipilih(null)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDipilih(null); }}>
          <div className="bith-daftar">
            <span className="bith-judul" title={bisaEdit ? 'Klik perintah untuk menyisipkannya ke kode. Arahkan kursor untuk melihat penjelasannya.' : 'Arahkan kursor ke perintah untuk melihat penjelasannya.'}>bit.h</span>
            {isiBitH.map((it) => (
              <button
                key={it.nama}
                type="button"
                className={`bith-chip${dipilih === it.nama ? ' dipilih' : ''}`}
                aria-disabled={!bisaEdit}
                aria-label={`${bisaEdit ? 'Sisipkan' : 'Perintah'} ${it.contoh}. ${it.penjelasan}`}
                onMouseEnter={() => setDipilih(it.nama)}
                onFocus={() => setDipilih(it.nama)}
                onClick={() => { setDipilih(it.nama); sisipPerintah(it.contoh); }}
              >
                {it.contoh}
              </button>
            ))}
          </div>
          {(() => {
            const it = isiBitH.find((x) => x.nama === dipilih);
            if (!it) return null;
            return (
              <p className="bith-tip" role="tooltip">
                <code>{it.prototipe}</code> {it.penjelasan}
                {bisaEdit ? <span className="bith-tip-aksi">Klik untuk menyisipkan ke kode.</span> : null}
              </p>
            );
          })()}
        </div>
      ) : null}
      <div className="papan-badan" ref={badan}>
        <div className="papan-nomor" aria-hidden="true">
          {baris.map((_, i) => (
            <div key={i} className={`nomor${barisAktif === i + 1 ? ' aktif' : ''}${barisGalat === i + 1 ? ' galat' : ''}`}>{i + 1}</div>
          ))}
        </div>
        <div className="papan-tulis" ref={wadah}>
          <div className="papan-lapis">
            <div className="papan-sorot" aria-hidden="true">
              {baris.map((teks, i) => (
                <div key={i} className={`baris${barisAktif === i + 1 ? ' aktif' : ''}${barisGalat === i + 1 ? ' galat' : ''}`}>
                  {teks ? warnai(teks) : ' '}
                </div>
              ))}
            </div>
            <textarea
              id={id}
              ref={input}
              className="papan-input"
              value={kode}
              onChange={(e) => onUbah && onUbah(e.target.value)}
              onKeyDown={tombol}
              onFocus={() => { if (bisaEdit) sudahFokus.current = true; }}
              onKeyUp={tampakkanKursor}
              onClick={tampakkanKursor}
              onScroll={jagaGulir}
              readOnly={!bisaEdit}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              wrap="off"
              aria-label="Kode program C"
              rows={baris.length}
            />
          </div>
        </div>
      </div>
      {kaki ? <footer className="papan-kaki">{kaki}</footer> : null}
    </section>
  );
}
