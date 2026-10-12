// Interpreter kecil untuk subset bahasa C.
// Program dijalankan sebagai generator: setiap kali satu pernyataan dieksekusi,
// interpreter mengirim satu "langkah" berisi baris aktif, isi variabel,
// hasil kondisi, dan informasi perulangan. Langkah inilah yang ditampilkan
// di panel eksekusi (visualisasi eksekusi kode).
//
// Yang didukung: #include (diabaikan), int main() { ... }, deklarasi int/float/
// double/char, = += -= *= /= %=, ++ dan --, if / else if / else, while,
// do-while, for, break, continue, return, printf, serta perintah Bit dari bit.h.

export class KodeError extends Error {
  constructor(baris, pesan) {
    super(pesan);
    this.baris = baris;
  }
}

const BATAS_LANGKAH = 800;
const TIPE_DASAR = new Set(['int', 'float', 'double', 'char', 'long', 'short', 'unsigned', 'bool']);
const KATA_KUNCI = new Set([...TIPE_DASAR, 'void', 'if', 'else', 'while', 'for', 'do', 'break', 'continue', 'return', 'true', 'false', 'main']);
const OPS = ['++', '--', '+=', '-=', '*=', '/=', '%=', '==', '!=', '<=', '>=', '&&', '||', '!', '<', '>', '=', '+', '-', '*', '/', '%', '(', ')', '{', '}', ';', ','];

// ------------------------------------------------------------------ tampilan nilai
export function tampil(nilai, tipe) {
  if (nilai === undefined || nilai === null) return '?';
  if (tipe === 'char') return `'${String.fromCharCode(nilai)}'`;
  if (tipe === 'teks') return `"${nilai}"`;
  if (tipe === 'float' || tipe === 'double') {
    const r = Math.round(nilai * 1000) / 1000;
    return Number.isInteger(r) ? r.toFixed(1) : String(r);
  }
  return String(nilai);
}
export const teksBenar = (b) => (b ? 'benar (1)' : 'salah (0)');

// ------------------------------------------------------------------ tokenizer
function escape(c) {
  return { n: '\n', t: '\t', '\\': '\\', '"': '"', "'": "'", 0: '\0' }[c] ?? c;
}

function tokenisasi(src) {
  const tok = [];
  let i = 0;
  let baris = 1;
  const n = src.length;
  let awalBaris = true;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { baris++; i++; awalBaris = true; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const mulai = baris;
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') baris++; i++; }
      if (i >= n) throw new KodeError(mulai, 'Komentar /* belum ditutup dengan */.');
      i += 2;
      continue;
    }
    if (c === '#') {
      if (!awalBaris) throw new KodeError(baris, 'Tanda # hanya dipakai di awal baris, misalnya #include <stdio.h>.');
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      tok.push({ t: 'pp', v: src.slice(i, j).trim(), baris });
      i = j;
      continue;
    }
    awalBaris = false;
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i;
      while (j < n && /[0-9.]/.test(src[j])) j++;
      const teks = src.slice(i, j);
      let pecahan = teks.includes('.');
      if (src[j] === 'f' || src[j] === 'F') { j++; pecahan = true; }
      tok.push({ t: 'angka', v: parseFloat(teks), pecahan, baris });
      i = j;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      let ch;
      if (src[j] === '\\') { ch = escape(src[j + 1]); j += 2; } else { ch = src[j]; j++; }
      if (src[j] !== "'") throw new KodeError(baris, "Karakter ditulis di antara tanda kutip tunggal, misalnya 'a'.");
      tok.push({ t: 'karakter', v: ch.charCodeAt(0), baris });
      i = j + 1;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < n && src[j] !== '"') {
        if (src[j] === '\n') throw new KodeError(baris, 'Teks belum ditutup dengan tanda kutip ".');
        if (src[j] === '\\') { s += escape(src[j + 1]); j += 2; } else { s += src[j]; j++; }
      }
      if (j >= n) throw new KodeError(baris, 'Teks belum ditutup dengan tanda kutip ".');
      tok.push({ t: 'teks', v: s, baris });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && /\w/.test(src[j])) j++;
      const kata = src.slice(i, j);
      if (/^_{3,}$/.test(kata)) throw new KodeError(baris, 'Bagian ___ masih kosong. Ganti dengan kode yang tepat sebelum dijalankan.');
      tok.push({ t: 'nama', v: kata, baris });
      i = j;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) { tok.push({ t: 'op', v: op, baris }); i += op.length; continue; }
    if (c === ':') throw new KodeError(baris, 'Bahasa C tidak memakai titik dua (:) untuk membuka blok. Gunakan kurung kurawal { }.');
    if (c === '[' || c === ']') throw new KodeError(baris, 'Array belum didukung di prototipe ini.');
    throw new KodeError(baris, `Simbol "${c}" tidak dikenali.`);
  }
  tok.push({ t: 'akhir', v: '', baris });
  return tok;
}

// ------------------------------------------------------------------ parser
export function parseProgram(sumber) {
  const tok = tokenisasi(sumber);
  let p = 0;
  const lihat = (k = 0) => tok[Math.min(p + k, tok.length - 1)];
  const ambil = () => tok[p++];
  const adalah = (v, k = 0) => {
    const t = lihat(k);
    return (t.t === 'op' || t.t === 'nama') && t.v === v;
  };
  const barisSebelum = () => (p > 0 ? tok[p - 1].baris : 1);
  function harus(v, pesan, pakaiBarisSebelum = false) {
    if (!adalah(v)) throw new KodeError(pakaiBarisSebelum ? barisSebelum() : lihat().baris, pesan);
    return ambil();
  }
  function titikKoma() {
    if (!adalah(';')) throw new KodeError(barisSebelum(), 'Kurang titik koma (;) di akhir perintah.');
    ambil();
  }

  // --- bagian atas: #include
  const include = [];
  while (lihat().t === 'pp') include.push(ambil());
  if (lihat().t === 'akhir') throw new KodeError(1, 'Kodenya masih kosong. Tulis program di dalam int main() { ... }.');
  if (!((adalah('int') || adalah('void')) && adalah('main', 1))) {
    throw new KodeError(lihat().baris, 'Program C harus berada di dalam fungsi int main() { ... }.');
  }
  ambil();
  const tMain = ambil();
  harus('(', 'Tulis fungsi utama seperti ini: int main() {');
  if (adalah('void')) ambil();
  harus(')', 'Tulis fungsi utama seperti ini: int main() {');
  if (!adalah('{')) throw new KodeError(tMain.baris, 'Isi fungsi main diawali kurung kurawal {.');
  const badan = blok();
  if (lihat().t !== 'akhir') {
    const t = lihat();
    if (t.t === 'pp') throw new KodeError(t.baris, '#include ditulis di baris paling atas.');
    if (adalah('}')) throw new KodeError(t.baris, 'Ada } yang tidak punya pasangan {.');
    throw new KodeError(t.baris, 'Ada kode di luar fungsi main. Pindahkan ke dalam kurung kurawal { } milik main.');
  }
  return { include, badan, barisMain: tMain.baris };

  // --- pernyataan
  function blok() {
    const buka = harus('{', 'Blok diawali kurung kurawal {.');
    const isi = [];
    while (!adalah('}')) {
      if (lihat().t === 'akhir') throw new KodeError(buka.baris, `Kurung kurawal { di baris ${buka.baris} belum ditutup dengan }.`);
      isi.push(pernyataan());
    }
    const tutup = ambil();
    return { jenis: 'blok', isi, baris: buka.baris, barisTutup: tutup.baris };
  }

  function badanAtauSatu() {
    if (adalah('{')) return blok();
    const st = pernyataan();
    return { jenis: 'blok', isi: [st], baris: st.baris, tanpaKurung: true };
  }

  function kondisiDalamKurung(kata, t) {
    if (!adalah('(')) {
      throw new KodeError(t.baris, `Kondisi ${kata} ditulis di dalam kurung, misalnya ${kata} (x < 5) { ... }`);
    }
    ambil();
    if (adalah(')')) throw new KodeError(t.baris, `Kondisi ${kata} masih kosong.`);
    const k = ekspresiKondisi();
    harus(')', `Kurung tutup ) untuk kondisi ${kata} belum ditulis.`, true);
    return k;
  }

  function ekspresiKondisi() {
    const e = ekspresi();
    if (e.jenis === 'isi' && e.op === '=') {
      throw new KodeError(barisSebelum(), 'Di dalam kondisi, gunakan == untuk membandingkan. Tanda = dipakai untuk mengisi nilai.');
    }
    return e;
  }

  function pernyataan() {
    const t = lihat();
    if (t.t === 'pp') throw new KodeError(t.baris, '#include ditulis di baris paling atas, di luar main.');
    if (adalah('{')) return blok();
    if (adalah(';')) { ambil(); return { jenis: 'kosong', baris: t.baris }; }
    if (adalah('}')) throw new KodeError(t.baris, 'Ada } yang tidak punya pasangan {.');
    if (adalah('if')) {
      ambil();
      const cabang = [{ baris: t.baris, kata: 'if', kondisi: kondisiDalamKurung('if', t) }];
      cabang[0].isi = badanAtauSatu();
      let lainnya = null;
      while (adalah('else')) {
        const e = ambil();
        if (adalah('if')) {
          const t2 = ambil();
          const c = { baris: t2.baris, kata: 'else if', kondisi: kondisiDalamKurung('else if', t2) };
          c.isi = badanAtauSatu();
          cabang.push(c);
        } else {
          lainnya = { baris: e.baris, isi: badanAtauSatu() };
          break;
        }
      }
      return { jenis: 'if', cabang, lainnya, baris: t.baris };
    }
    if (adalah('elif')) throw new KodeError(t.baris, 'Bahasa C memakai else if, bukan elif.');
    if (adalah('else')) throw new KodeError(t.baris, 'else harus tepat setelah kurung kurawal penutup } milik if.');
    if (adalah('while')) {
      ambil();
      const kondisi = kondisiDalamKurung('while', t);
      return { jenis: 'while', kondisi, isi: badanAtauSatu(), baris: t.baris };
    }
    if (adalah('do')) {
      ambil();
      const isi = blok();
      const w = harus('while', 'Setelah blok do { } tulis while (kondisi);');
      const kondisi = kondisiDalamKurung('while', w);
      titikKoma();
      return { jenis: 'do', kondisi, isi, baris: t.baris, barisWhile: w.baris };
    }
    if (adalah('for')) {
      ambil();
      const contoh = 'Tulis perulangan for seperti ini: for (int i = 0; i < 5; i++) { ... }';
      if (!adalah('(')) throw new KodeError(t.baris, contoh);
      ambil();
      let awal = null;
      if (!adalah(';')) {
        if (lihat().t === 'nama' && TIPE_DASAR.has(lihat().v)) awal = deklarasi();
        else awal = { jenis: 'ekspresi', eks: ekspresi(), baris: t.baris };
      }
      harus(';', contoh, true);
      const kondisi = adalah(';') ? null : ekspresiKondisi();
      harus(';', contoh, true);
      const ubah = adalah(')') ? null : ekspresi();
      harus(')', 'Kurung tutup ) untuk for belum ditulis.', true);
      const isi = badanAtauSatu();
      const teksAwal = awal ? (awal.jenis === 'deklarasi' ? teksDeklarasi(awal) : teksEks(awal.eks)) : '';
      const teks = `for (${teksAwal}; ${kondisi ? teksEks(kondisi) : ''}; ${ubah ? teksEks(ubah) : ''})`;
      return { jenis: 'for', awal, kondisi, ubah, isi, baris: t.baris, teks };
    }
    if (adalah('break') || adalah('continue')) {
      ambil();
      titikKoma();
      return { jenis: t.v, baris: t.baris };
    }
    if (adalah('return')) {
      ambil();
      const nilai = adalah(';') ? null : ekspresi();
      titikKoma();
      return { jenis: 'return', nilai, baris: t.baris };
    }
    if (t.t === 'nama' && TIPE_DASAR.has(t.v)) {
      const d = deklarasi();
      titikKoma();
      return d;
    }
    if (adalah('print') || adalah('println') || adalah('cout')) {
      throw new KodeError(t.baris, 'Untuk menampilkan nilai di bahasa C, gunakan printf, misalnya printf("%d\\n", x);');
    }
    const eks = ekspresi();
    if (!['isi', 'ubah1', 'panggil'].includes(eks.jenis)) {
      throw new KodeError(t.baris, 'Baris ini tidak melakukan apa-apa. Perintah ditulis seperti maju(); atau x = 5;');
    }
    titikKoma();
    return { jenis: 'ekspresi', eks, baris: t.baris };
  }

  function deklarasi() {
    const tTipe = ambil();
    let tipe = tTipe.v;
    if (tipe === 'unsigned' || tipe === 'long' || tipe === 'short') {
      while (lihat().t === 'nama' && ['int', 'long', 'short'].includes(lihat().v)) ambil();
      tipe = 'int';
    }
    if (tipe === 'bool') tipe = 'int';
    const daftar = [];
    do {
      const nm = ambil();
      if (nm.t !== 'nama' || KATA_KUNCI.has(nm.v)) {
        throw new KodeError(nm.baris, `Setelah ${tTipe.v} tulis nama variabelnya, misalnya ${tTipe.v} x = 0;`);
      }
      if (adalah('(')) throw new KodeError(nm.baris, 'Prototipe ini baru mendukung fungsi main.');
      let nilai = null;
      if (adalah('=')) { ambil(); nilai = ekspresi(); }
      daftar.push({ nama: nm.v, nilai, baris: nm.baris });
    } while (adalah(',') && ambil());
    return { jenis: 'deklarasi', tipe, daftar, baris: tTipe.baris };
  }

  // --- ekspresi
  function ekspresi() { return penugasan(); }
  function penugasan() {
    const kiri = atau();
    if (lihat().t === 'op' && ['=', '+=', '-=', '*=', '/=', '%='].includes(lihat().v)) {
      const tOp = ambil();
      if (kiri.jenis !== 'var') throw new KodeError(tOp.baris, `Di sebelah kiri tanda ${tOp.v} harus nama variabel.`);
      return { jenis: 'isi', op: tOp.v, nama: kiri.nama, nilai: penugasan() };
    }
    return kiri;
  }
  function rantai(turun, ops) {
    let kiri = turun();
    while (lihat().t === 'op' && ops.includes(lihat().v)) {
      const op = ambil().v;
      kiri = { jenis: 'biner', op, kiri, kanan: turun() };
    }
    return kiri;
  }
  // urutan kekuatan operator: || < && < == != < < > <= >= < + - < * / % < unary
  function atau() { return rantai(dan, ['||']); }
  function dan() { return rantai(sama, ['&&']); }
  function sama() { return rantai(banding, ['==', '!=']); }
  function banding() { return rantai(tambah, ['<', '>', '<=', '>=']); }
  function tambah() { return rantai(kali, ['+', '-']); }
  function kali() { return rantai(unary, ['*', '/', '%']); }
  function unary() {
    const t = lihat();
    if (t.t === 'op' && ['!', '-', '+'].includes(t.v)) { ambil(); return { jenis: 'unary', op: t.v, isi: unary() }; }
    if (t.t === 'op' && (t.v === '++' || t.v === '--')) {
      ambil();
      const v = ambil();
      if (v.t !== 'nama') throw new KodeError(t.baris, `${t.v} dipakai pada nama variabel, misalnya ${t.v}i.`);
      return { jenis: 'ubah1', op: t.v, nama: v.v, awalan: true };
    }
    return postfix();
  }
  function postfix() {
    const e = primer();
    if (e.jenis === 'var' && lihat().t === 'op' && (lihat().v === '++' || lihat().v === '--')) {
      return { jenis: 'ubah1', op: ambil().v, nama: e.nama, awalan: false };
    }
    return e;
  }
  function primer() {
    const t = ambil();
    if (t.t === 'angka') return { jenis: 'angka', v: t.v, pecahan: t.pecahan };
    if (t.t === 'karakter') return { jenis: 'karakter', v: t.v };
    if (t.t === 'teks') return { jenis: 'teks', v: t.v };
    if (t.t === 'nama') {
      if (t.v === 'true' || t.v === 'false') return { jenis: 'angka', v: t.v === 'true' ? 1 : 0, pecahan: false };
      if (adalah('(')) {
        ambil();
        const arg = [];
        if (!adalah(')')) {
          arg.push(ekspresi());
          while (adalah(',')) { ambil(); arg.push(ekspresi()); }
        }
        harus(')', `Perintah ${t.v}( belum ditutup dengan ).`, true);
        return { jenis: 'panggil', nama: t.v, arg, baris: t.baris };
      }
      if (KATA_KUNCI.has(t.v)) throw new KodeError(t.baris, `"${t.v}" adalah kata kunci bahasa C dan tidak bisa dipakai di sini.`);
      return { jenis: 'var', nama: t.v };
    }
    if (t.t === 'op' && t.v === '(') {
      const e = ekspresi();
      harus(')', 'Kurung buka ( belum ditutup dengan ).', true);
      return { jenis: 'kurung', isi: e };
    }
    if (t.t === 'akhir') throw new KodeError(t.baris, 'Kodenya berhenti di tengah perintah.');
    if (t.t === 'op' && t.v === ';') throw new KodeError(t.baris, 'Ada perintah yang belum lengkap sebelum titik koma.');
    throw new KodeError(t.baris, `Ada yang janggal di dekat "${t.v}".`);
  }
}

// ------------------------------------------------------------------ teks ekspresi
export function teksEks(e) {
  switch (e.jenis) {
    case 'angka': return e.pecahan && Number.isInteger(e.v) ? e.v.toFixed(1) : String(e.v);
    case 'karakter': return `'${String.fromCharCode(e.v)}'`;
    case 'teks': return JSON.stringify(e.v);
    case 'var': return e.nama;
    case 'kurung': return `(${teksEks(e.isi)})`;
    case 'panggil': return `${e.nama}(${e.arg.map(teksEks).join(', ')})`;
    case 'unary': return `${e.op}${teksEks(e.isi)}`;
    case 'biner': return `${teksEks(e.kiri)} ${e.op} ${teksEks(e.kanan)}`;
    case 'isi': return `${e.nama} ${e.op} ${teksEks(e.nilai)}`;
    case 'ubah1': return e.awalan ? `${e.op}${e.nama}` : `${e.nama}${e.op}`;
    default: return '?';
  }
}
function teksDeklarasi(d) {
  return `${d.tipe} ${d.daftar.map((x) => (x.nilai ? `${x.nama} = ${teksEks(x.nilai)}` : x.nama)).join(', ')}`;
}

// ------------------------------------------------------------------ eksekusi
const SINYAL_BREAK = { sinyal: 'break' };
const SINYAL_CONTINUE = { sinyal: 'continue' };
const SINYAL_RETURN = { sinyal: 'return' };

export function* jalankan(sumber, dunia) {
  const program = parseProgram(sumber);
  const lingkup = [new Map()];
  let keluaran = '';
  const perulangan = {};
  let jumlahLangkah = 0;

  // --- variabel
  function cari(nama, baris) {
    for (let k = lingkup.length - 1; k >= 0; k--) if (lingkup[k].has(nama)) return lingkup[k].get(nama);
    if (dunia.punyaAksi(nama) || dunia.punyaSensor(nama)) {
      throw new KodeError(baris, `${nama} adalah perintah Bit. Tulis dengan kurung: ${nama}().`);
    }
    throw new KodeError(baris, `Variabel ${nama} belum dideklarasikan. Tulis dulu int ${nama};`);
  }
  function deklarasikan(nama, tipe, baris) {
    const atas = lingkup[lingkup.length - 1];
    if (atas.has(nama)) throw new KodeError(baris, `Variabel ${nama} sudah dideklarasikan sebelumnya.`);
    const v = { tipe, nilai: undefined, diisi: false };
    atas.set(nama, v);
    return v;
  }
  function sesuaikan(tipe, nilai) {
    if (tipe === 'int') return Math.trunc(nilai);
    if (tipe === 'char') return ((Math.trunc(nilai) % 256) + 256) % 256;
    return nilai;
  }
  function potretVariabel() {
    const hasil = {};
    for (const m of lingkup) for (const [nama, v] of m) hasil[nama] = { tipe: v.tipe, nilai: v.nilai, diisi: v.diisi };
    return hasil;
  }

  function langkah(baris, data) {
    jumlahLangkah++;
    if (jumlahLangkah > BATAS_LANGKAH) {
      throw new KodeError(baris, `Program sudah berjalan lebih dari ${BATAS_LANGKAH} langkah. Kemungkinan perulangannya tidak pernah berhenti. Periksa kondisi perulangan.`);
    }
    return {
      baris,
      ...data,
      vars: potretVariabel(),
      ubah: data.ubah || [],
      perulangan: JSON.parse(JSON.stringify(perulangan)),
      output: keluaran,
      nomor: jumlahLangkah,
    };
  }

  // --- nilai ekspresi: { v, t }
  function nilai(e, baris) {
    switch (e.jenis) {
      case 'angka': return { v: e.v, t: e.pecahan ? 'double' : 'int' };
      case 'karakter': return { v: e.v, t: 'char' };
      case 'teks': return { v: e.v, t: 'teks' };
      case 'kurung': return nilai(e.isi, baris);
      case 'var': {
        const v = cari(e.nama, baris);
        if (!v.diisi) throw new KodeError(baris, `Variabel ${e.nama} belum diberi nilai. Beri nilai dulu, misalnya ${e.nama} = 0;`);
        return { v: v.nilai, t: v.tipe };
      }
      case 'unary': {
        const a = nilai(e.isi, baris);
        cekAngka(a, e.op, baris);
        if (e.op === '!') return { v: a.v ? 0 : 1, t: 'int' };
        if (e.op === '-') return { v: -a.v, t: a.t === 'char' ? 'int' : a.t };
        return a;
      }
      case 'biner': return biner(e, baris);
      case 'isi': return isi(e, baris).baru;
      case 'ubah1': return ubah1(e, baris).hasil;
      case 'panggil': {
        if (e.nama === 'printf') { printf(e, baris); return { v: 0, t: 'int' }; }
        if (dunia.punyaSensor(e.nama)) return bacaSensor(e, baris);
        if (dunia.punyaAksi(e.nama)) throw new KodeError(baris, `${e.nama}() adalah perintah, tulis di baris tersendiri: ${e.nama}();`);
        throw new KodeError(baris, perintahTidakDikenal(e.nama, dunia));
      }
      default: throw new KodeError(baris, 'Ekspresi tidak dikenali.');
    }
  }
  function cekAngka(a, op, baris) {
    if (a.t === 'teks') throw new KodeError(baris, `Operasi ${op} tidak bisa dipakai pada teks.`);
  }
  function biner(e, baris) {
    if (e.op === '&&') { const a = nilai(e.kiri, baris); if (!a.v) return { v: 0, t: 'int' }; return { v: nilai(e.kanan, baris).v ? 1 : 0, t: 'int' }; }
    if (e.op === '||') { const a = nilai(e.kiri, baris); if (a.v) return { v: 1, t: 'int' }; return { v: nilai(e.kanan, baris).v ? 1 : 0, t: 'int' }; }
    const a = nilai(e.kiri, baris);
    const b = nilai(e.kanan, baris);
    cekAngka(a, e.op, baris);
    cekAngka(b, e.op, baris);
    const bulat = a.t !== 'float' && a.t !== 'double' && b.t !== 'float' && b.t !== 'double';
    const tHasil = bulat ? 'int' : 'double';
    switch (e.op) {
      case '+': return { v: a.v + b.v, t: tHasil };
      case '-': return { v: a.v - b.v, t: tHasil };
      case '*': return { v: a.v * b.v, t: tHasil };
      case '/':
        if (b.v === 0) throw new KodeError(baris, 'Tidak bisa membagi dengan nol.');
        return { v: bulat ? Math.trunc(a.v / b.v) : a.v / b.v, t: tHasil };
      case '%':
        if (!bulat) throw new KodeError(baris, 'Operator % hanya untuk bilangan bulat (int).');
        if (b.v === 0) throw new KodeError(baris, 'Tidak bisa membagi dengan nol.');
        return { v: a.v % b.v, t: 'int' };
      case '==': return { v: a.v === b.v ? 1 : 0, t: 'int' };
      case '!=': return { v: a.v !== b.v ? 1 : 0, t: 'int' };
      case '<': return { v: a.v < b.v ? 1 : 0, t: 'int' };
      case '>': return { v: a.v > b.v ? 1 : 0, t: 'int' };
      case '<=': return { v: a.v <= b.v ? 1 : 0, t: 'int' };
      case '>=': return { v: a.v >= b.v ? 1 : 0, t: 'int' };
      default: throw new KodeError(baris, `Operator ${e.op} tidak dikenali.`);
    }
  }
  function isi(e, baris) {
    const v = cari(e.nama, baris);
    const kanan = nilai(e.nilai, baris);
    if (kanan.t === 'teks') throw new KodeError(baris, `Teks tidak bisa disimpan ke variabel ${v.tipe}.`);
    let baru = kanan.v;
    const lama = v.nilai;
    if (e.op !== '=') {
      if (!v.diisi) throw new KodeError(baris, `Variabel ${e.nama} belum diberi nilai, jadi belum bisa diubah dengan ${e.op}.`);
      baru = biner({ op: e.op[0], kiri: { jenis: 'var', nama: e.nama }, kanan: e.nilai }, baris).v;
    }
    const pertama = !v.diisi;
    v.nilai = sesuaikan(v.tipe, baru);
    v.diisi = true;
    return { lama, pertama, baru: { v: v.nilai, t: v.tipe } };
  }
  function ubah1(e, baris) {
    const v = cari(e.nama, baris);
    if (!v.diisi) throw new KodeError(baris, `Variabel ${e.nama} belum diberi nilai, jadi belum bisa ${e.op === '++' ? 'ditambah' : 'dikurangi'}.`);
    const lama = v.nilai;
    v.nilai = sesuaikan(v.tipe, lama + (e.op === '++' ? 1 : -1));
    return { lama, hasil: { v: e.awalan ? v.nilai : lama, t: v.tipe } };
  }
  function bacaSensor(e, baris) {
    if (e.arg.length) throw new KodeError(baris, `${e.nama}() tidak memerlukan isian di dalam kurung.`);
    try {
      const h = dunia.sensor(e.nama, [], baris);
      return { v: typeof h === 'boolean' ? (h ? 1 : 0) : h, t: 'int' };
    } catch (err) {
      if (err instanceof KodeError) throw err;
      throw new KodeError(baris, err.message);
    }
  }
  function printf(e, baris) {
    if (!e.arg.length || e.arg[0].jenis !== 'teks') {
      throw new KodeError(baris, 'printf diawali teks format di dalam tanda kutip, misalnya printf("%d\\n", x);');
    }
    const fmt = e.arg[0].v;
    const arg = e.arg.slice(1).map((a) => nilai(a, baris));
    let out = '';
    let ai = 0;
    for (let i = 0; i < fmt.length;) {
      if (fmt[i] !== '%') { out += fmt[i]; i++; continue; }
      if (fmt[i + 1] === '%') { out += '%'; i += 2; continue; }
      const m = fmt.slice(i).match(/^%(-?)(\d*)(?:\.(\d+))?(lf|ld|li|d|i|u|f|c|s)/);
      if (!m) throw new KodeError(baris, `Format ${fmt.slice(i, i + 2)} di printf belum didukung. Gunakan %d, %f, %c, atau %s.`);
      if (ai >= arg.length) throw new KodeError(baris, `printf membutuhkan nilai untuk ${m[0]}. Tulis nilainya setelah tanda koma.`);
      const a = arg[ai++];
      const jenis = m[4].replace('l', '');
      let s;
      if (jenis === 'd' || jenis === 'i' || jenis === 'u') s = String(Math.trunc(a.v));
      else if (jenis === 'f') s = Number(a.v).toFixed(m[3] !== undefined ? Number(m[3]) : 6);
      else if (jenis === 'c') s = String.fromCharCode(a.v);
      else s = String(a.v);
      if (m[2]) s = m[1] ? s.padEnd(Number(m[2])) : s.padStart(Number(m[2]));
      out += s;
      i += m[0].length;
    }
    keluaran += out;
    return out;
  }

  // ekspresi dengan nama variabel diganti nilainya, untuk panel kondisi
  function rincian(e, baris) {
    switch (e.jenis) {
      case 'angka': case 'karakter': case 'teks': return teksEks(e);
      case 'var': { const v = cari(e.nama, baris); return v.diisi ? tampil(v.nilai, v.tipe) : e.nama; }
      case 'panggil': return e.nama === 'printf' ? teksEks(e) : tampil(nilai(e, baris).v, 'int');
      case 'kurung': return `(${rincian(e.isi, baris)})`;
      case 'unary': return `${e.op}${rincian(e.isi, baris)}`;
      case 'biner': return `${rincian(e.kiri, baris)} ${e.op} ${rincian(e.kanan, baris)}`;
      default: return teksEks(e);
    }
  }

  // Perhitungan ruas kanan penugasan untuk panel eksekusi, misalnya
  // total + cek_cahaya() -> 0 + 30. Angka biasa (x = 5) tidak perlu dirinci.
  function perluRincian(e) {
    return !['angka', 'karakter', 'teks'].includes(e.jenis);
  }
  function siapkanHitung(kanan, baris) {
    if (!perluRincian(kanan)) return null;
    return { teks: teksEks(kanan), rincian: rincian(kanan, baris) };
  }

  // --- pernyataan
  function* blok(b) {
    lingkup.push(new Map());
    try {
      for (const st of b.isi) yield* pernyataan(st);
    } finally {
      lingkup.pop();
    }
  }

  function* pernyataanEkspresi(e, baris) {
    if (e.jenis === 'isi') {
      const kanan = e.op === '=' ? e.nilai : { jenis: 'biner', op: e.op[0], kiri: { jenis: 'var', nama: e.nama }, kanan: e.nilai };
      const hitung = siapkanHitung(kanan, baris);
      const h = isi(e, baris);
      const pesan = h.pertama
        ? `${e.nama} diisi nilai ${tampil(h.baru.v, h.baru.t)}.`
        : `Nilai ${e.nama} berubah dari ${tampil(h.lama, h.baru.t)} menjadi ${tampil(h.baru.v, h.baru.t)}.`;
      yield langkah(baris, {
        jenis: 'isi',
        pesan,
        ubah: [e.nama],
        hitung: hitung ? { ...hitung, nama: e.nama, hasil: tampil(h.baru.v, h.baru.t) } : null,
      });
      return;
    }
    if (e.jenis === 'ubah1') {
      const h = ubah1(e, baris);
      const v = cari(e.nama, baris);
      yield langkah(baris, {
        jenis: 'isi',
        pesan: `${teksEks(e)}: nilai ${e.nama} ${e.op === '++' ? 'bertambah' : 'berkurang'} dari ${tampil(h.lama, v.tipe)} menjadi ${tampil(v.nilai, v.tipe)}.`,
        ubah: [e.nama],
      });
      return;
    }
    // panggil
    if (e.nama === 'printf') {
      const teks = printf(e, baris);
      yield langkah(baris, { jenis: 'output', pesan: `printf menampilkan: ${JSON.stringify(teks)}` });
      return;
    }
    if (dunia.punyaAksi(e.nama)) {
      if (e.arg.length) throw new KodeError(baris, `${e.nama}() tidak memerlukan isian di dalam kurung.`);
      const hasil = dunia.aksi(e.nama, []);
      if (hasil.fatal) throw new KodeError(baris, hasil.pesan);
      yield langkah(baris, { jenis: 'aksi', aksi: e.nama, pesan: hasil.pesan, peringatan: !!hasil.peringatan });
      return;
    }
    if (dunia.punyaSensor(e.nama)) {
      const v = bacaSensor(e, baris);
      yield langkah(baris, { jenis: 'aksi', aksi: e.nama, pesan: `${e.nama}() menghasilkan ${v.v}, tetapi nilainya tidak disimpan ke variabel.` });
      return;
    }
    throw new KodeError(baris, perintahTidakDikenal(e.nama, dunia));
  }

  function* pernyataan(st) {
    switch (st.jenis) {
      case 'kosong': return;
      case 'blok': yield* blok(st); return;
      case 'deklarasi': {
        const bagian = [];
        const nama = [];
        let hitung = null;
        for (const d of st.daftar) {
          const h = !hitung && d.nilai ? siapkanHitung(d.nilai, d.baris) : null;
          const nilaiAwal = d.nilai ? nilai(d.nilai, d.baris) : null;
          if (nilaiAwal && nilaiAwal.t === 'teks') throw new KodeError(d.baris, `Teks tidak bisa disimpan ke variabel ${st.tipe}.`);
          const v = deklarasikan(d.nama, st.tipe, d.baris);
          if (nilaiAwal) { v.nilai = sesuaikan(st.tipe, nilaiAwal.v); v.diisi = true; }
          if (h) hitung = { ...h, nama: d.nama, hasil: tampil(v.nilai, st.tipe) };
          nama.push(d.nama);
          bagian.push(nilaiAwal ? `${d.nama} = ${tampil(v.nilai, st.tipe)}` : `${d.nama} (belum diberi nilai)`);
        }
        yield langkah(st.baris, { jenis: 'deklarasi', pesan: `Variabel ${st.tipe} dibuat: ${bagian.join(', ')}.`, ubah: nama, hitung });
        return;
      }
      case 'ekspresi': yield* pernyataanEkspresi(st.eks, st.baris); return;
      case 'if': {
        for (const cab of st.cabang) {
          const detail = rincian(cab.kondisi, cab.baris);
          const hasil = !!nilai(cab.kondisi, cab.baris).v;
          yield langkah(cab.baris, {
            jenis: 'kondisi',
            kondisi: { teks: teksEks(cab.kondisi), rincian: detail, hasil, kata: cab.kata },
            pesan: `Kondisi ${teksEks(cab.kondisi)} → ${detail} → ${teksBenar(hasil)}. ${hasil ? `Isi blok ${cab.kata} dijalankan.` : `Isi blok ${cab.kata} dilewati.`}`,
            akibat: hasil ? `Isi blok ${cab.kata} dijalankan.` : `Isi blok ${cab.kata} dilewati.`,
          });
          if (hasil) { yield* blok(cab.isi); return; }
        }
        if (st.lainnya) {
          yield langkah(st.lainnya.baris, {
            jenis: 'else',
            kondisi: { teks: 'else', rincian: '', hasil: true, kata: 'else' },
            pesan: 'Semua kondisi di atasnya salah (0), jadi isi blok else dijalankan.',
            akibat: 'Semua kondisi di atasnya salah (0), jadi isi blok else dijalankan.',
          });
          yield* blok(st.lainnya.isi);
        }
        return;
      }
      case 'while':
      case 'do': {
        const info = { jenis: st.jenis, putaran: 0, teks: `while (${teksEks(st.kondisi)})` };
        perulangan[st.baris] = info;
        let pertama = st.jenis === 'do';
        while (true) {
          if (!pertama) {
            const detail = rincian(st.kondisi, st.baris);
            const hasil = !!nilai(st.kondisi, st.baris).v;
            const barisCek = st.jenis === 'do' ? st.barisWhile : st.baris;
            yield langkah(barisCek, {
              jenis: 'ulang',
              kondisi: { teks: teksEks(st.kondisi), rincian: detail, hasil, kata: 'while' },
              pesan: hasil
                ? `Cek kondisi ${teksEks(st.kondisi)} → ${detail} → benar (1). Putaran ke-${info.putaran + 1} dijalankan.`
                : `Cek kondisi ${teksEks(st.kondisi)} → ${detail} → salah (0). Perulangan berhenti setelah ${info.putaran} putaran.`,
              akibat: hasil ? `Putaran ke-${info.putaran + 1} dijalankan.` : `Perulangan berhenti setelah ${info.putaran} putaran.`,
            });
            if (!hasil) break;
          }
          pertama = false;
          info.putaran++;
          try {
            yield* blok(st.isi);
          } catch (s) {
            if (s === SINYAL_BREAK) break;
            if (s !== SINYAL_CONTINUE) throw s;
          }
        }
        info.selesai = true;
        return;
      }
      case 'for': {
        lingkup.push(new Map());
        const info = { jenis: 'for', putaran: 0, teks: st.teks };
        perulangan[st.baris] = info;
        try {
          if (st.awal) {
            if (st.awal.jenis === 'deklarasi') {
              const nama = [];
              for (const d of st.awal.daftar) {
                const v = deklarasikan(d.nama, st.awal.tipe, st.baris);
                if (d.nilai) { v.nilai = sesuaikan(st.awal.tipe, nilai(d.nilai, st.baris).v); v.diisi = true; }
                nama.push(d.nama);
              }
              yield langkah(st.baris, { jenis: 'for_awal', pesan: `Perulangan for dimulai: ${teksDeklarasi(st.awal)}.`, ubah: nama });
            } else {
              nilai(st.awal.eks, st.baris);
              yield langkah(st.baris, { jenis: 'for_awal', pesan: `Perulangan for dimulai: ${teksEks(st.awal.eks)}.`, ubah: st.awal.eks.nama ? [st.awal.eks.nama] : [] });
            }
          }
          while (true) {
            if (st.kondisi) {
              const detail = rincian(st.kondisi, st.baris);
              const hasil = !!nilai(st.kondisi, st.baris).v;
              yield langkah(st.baris, {
                jenis: 'ulang',
                kondisi: { teks: teksEks(st.kondisi), rincian: detail, hasil, kata: 'for' },
                pesan: hasil
                  ? `Cek kondisi ${teksEks(st.kondisi)} → ${detail} → benar (1). Putaran ke-${info.putaran + 1} dijalankan.`
                  : `Cek kondisi ${teksEks(st.kondisi)} → ${detail} → salah (0). Perulangan selesai setelah ${info.putaran} putaran.`,
                akibat: hasil ? `Putaran ke-${info.putaran + 1} dijalankan.` : `Perulangan selesai setelah ${info.putaran} putaran.`,
              });
              if (!hasil) break;
            }
            info.putaran++;
            try {
              yield* blok(st.isi);
            } catch (s) {
              if (s === SINYAL_BREAK) break;
              if (s !== SINYAL_CONTINUE) throw s;
            }
            if (st.ubah) {
              const nm = st.ubah.nama;
              const sebelum = nm ? cari(nm, st.baris).nilai : undefined;
              nilai(st.ubah, st.baris);
              const sesudah = nm ? cari(nm, st.baris) : null;
              yield langkah(st.baris, {
                jenis: 'for_ubah',
                pesan: nm
                  ? `${teksEks(st.ubah)}: nilai ${nm} berubah dari ${tampil(sebelum, sesudah.tipe)} menjadi ${tampil(sesudah.nilai, sesudah.tipe)}.`
                  : `${teksEks(st.ubah)} dijalankan.`,
                ubah: nm ? [nm] : [],
              });
            }
          }
          info.selesai = true;
        } finally {
          lingkup.pop();
        }
        return;
      }
      case 'break':
        yield langkah(st.baris, { jenis: 'break', pesan: 'break: keluar dari perulangan.' });
        throw SINYAL_BREAK;
      case 'continue':
        yield langkah(st.baris, { jenis: 'continue', pesan: 'continue: lanjut ke putaran berikutnya.' });
        throw SINYAL_CONTINUE;
      case 'return': {
        const v = st.nilai ? nilai(st.nilai, st.baris).v : 0;
        yield langkah(st.baris, { jenis: 'return', pesan: `return ${v}: program selesai.` });
        throw SINYAL_RETURN;
      }
      default:
        throw new KodeError(st.baris, 'Pernyataan tidak dikenali.');
    }
  }

  try {
    yield* blok(program.badan);
  } catch (s) {
    if (s === SINYAL_BREAK || s === SINYAL_CONTINUE) throw new KodeError(program.barisMain, 'break dan continue hanya boleh dipakai di dalam perulangan.');
    if (s !== SINYAL_RETURN) throw s;
  }
  return { output: keluaran };
}

function perintahTidakDikenal(nama, dunia) {
  const daftar = dunia.daftarPerintah().map((p) => `${p}()`).join(', ');
  return `Perintah ${nama}() tidak dikenal. Yang bisa dipakai di level ini: ${daftar}, dan printf().`;
}
