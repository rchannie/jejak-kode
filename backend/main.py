"""Backend Jejak Kode (FastAPI).

Menyimpan akun guru dan siswa, kelas, serta progres dan LKPD setiap siswa.
Guru memantau kelasnya lewat dasbor guru, siswa hanya bisa melihat datanya sendiri.

Menjalankan (pengembangan):
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Pengaturan lewat variabel lingkungan atau file backend/.env:
    DATABASE_URL       alamat PostgreSQL (kosongkan untuk memakai SQLite lokal)
    KODE_DAFTAR_GURU   kode rahasia untuk mendaftar sebagai guru (kosong = pendaftaran guru ditutup)
    COOKIE_AMAN        1 untuk memaksa cookie hanya lewat HTTPS, 0 untuk mematikan (bawaan: otomatis)

Jika folder ../frontend/dist sudah ada (hasil `npm run build`), backend ini
juga menyajikan game-nya, jadi cukup buka http://localhost:8000 di browser.
Panduan lengkap ada di DEPLOY.md.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import and_, delete, func, insert, select, update
from sqlalchemy.exc import IntegrityError

FOLDER = Path(__file__).resolve().parent


def _muat_env(jalur: Path) -> None:
    """Membaca backend/.env sederhana (KUNCI=nilai) tanpa pustaka tambahan."""
    if not jalur.exists():
        return
    for baris in jalur.read_text(encoding='utf-8').splitlines():
        baris = baris.strip()
        if not baris or baris.startswith('#') or '=' not in baris:
            continue
        kunci, nilai = baris.split('=', 1)
        os.environ.setdefault(kunci.strip(), nilai.strip().strip('"').strip("'"))


_muat_env(FOLDER / '.env')

import basisdata as bd  # noqa: E402  (setelah .env dibaca)
from keamanan import (  # noqa: E402
    HASH_PALSU,
    Pembatas,
    cocok_sandi,
    hash_sandi,
    hash_token,
    kode_kelas_baru,
    rapikan_kode,
    sandi_sementara,
    token_baru,
)

FRONTEND_DIST = FOLDER.parent / 'frontend' / 'dist'
NAMA_COOKIE = 'jk_sesi'
UMUR_SESI_HARI = 14
POLA_USERNAME = re.compile(r'^[a-z0-9][a-z0-9._]{2,29}$')
POLA_LEVEL = re.compile(r'^L\d{1,2}$')
BATAS_DATA_PROGRES = 200_000  # byte JSON per level

mesin = bd.buat_mesin()
bd.siapkan(mesin)

# Hosting seperti Railway dan Render menghapus file setiap kali server dimulai ulang.
# Tanpa DATABASE_URL, semua akun dan progres akan hilang, jadi beri peringatan jelas.
if (os.environ.get('RAILWAY_ENVIRONMENT') or os.environ.get('RENDER')) and mesin.dialect.name == 'sqlite':
    print('PERINGATAN: DATABASE_URL belum diisi. Di hosting, data SQLite hilang setiap server dimulai ulang. '
          'Isi DATABASE_URL dengan alamat PostgreSQL dari Supabase (lihat DEPLOY.md).', flush=True)

app = FastAPI(title='Jejak Kode API', version='0.2.0')
asal = [a.strip() for a in os.environ.get('ASAL_DIIZINKAN', 'http://localhost:5173,http://127.0.0.1:5173').split(',') if a.strip()]
app.add_middleware(CORSMiddleware, allow_origins=asal, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

# Satu kelas biasanya keluar ke internet lewat satu IP sekolah yang sama, jadi
# batas per IP dibuat longgar. Batas per username berlaku dari IP mana pun,
# supaya tebakan kata sandi tetap tertahan walau IP-nya berganti-ganti.
pembatas_masuk = Pembatas(maks=8, detik=600)       # per IP + username
pembatas_username = Pembatas(maks=20, detik=600)   # per username
pembatas_kode = Pembatas(maks=60, detik=600)       # per IP, salah kode kelas atau kode guru


@app.middleware('http')
async def header_keamanan(request: Request, call_next):
    respons = await call_next(request)
    respons.headers.setdefault('X-Content-Type-Options', 'nosniff')
    respons.headers.setdefault('Referrer-Policy', 'same-origin')
    if request.url.path.startswith('/api/'):
        # Jawaban API berisi data akun. Jangan pernah disimpan cache, termasuk
        # oleh CDN Vercel yang meneruskan /api ke server ini.
        respons.headers['Cache-Control'] = 'no-store'
        respons.headers['CDN-Cache-Control'] = 'no-store'
    return respons


def kode_daftar_guru() -> str:
    return os.environ.get('KODE_DAFTAR_GURU', '').strip()


def galat(status: int, pesan: str) -> HTTPException:
    return HTTPException(status_code=status, detail=pesan)


# ------------------------------------------------------------------ skema masukan
class Masuk(BaseModel):
    username: str
    sandi: str


class DaftarSiswa(BaseModel):
    nama: str
    username: str
    sandi: str
    kodeKelas: str


class DaftarGuru(BaseModel):
    nama: str
    username: str
    sandi: str
    kodeGuru: str


class GantiSandi(BaseModel):
    sandiLama: str
    sandiBaru: str


class SimpanProgres(BaseModel):
    data: dict[str, Any]


class KelasBaru(BaseModel):
    nama: str


class UbahKelas(BaseModel):
    nama: str | None = None
    pendaftaranDibuka: bool | None = None
    kodeBaru: bool = False


class UbahSiswa(BaseModel):
    nama: str | None = None
    kelasId: int | None = None


# ------------------------------------------------------------------ pemeriksaan isian
def cek_nama(nama: str) -> str:
    nama = ' '.join(nama.split())
    if not 2 <= len(nama) <= 80:
        raise galat(400, 'Nama harus 2 sampai 80 huruf.')
    return nama


def cek_username(username: str) -> str:
    username = username.strip().lower()
    if not POLA_USERNAME.match(username):
        raise galat(400, 'Username 3 sampai 30 karakter, hanya huruf kecil, angka, titik, atau garis bawah, dan diawali huruf atau angka.')
    return username


def cek_sandi(sandi: str, minimal: int) -> str:
    if len(sandi) < minimal:
        raise galat(400, f'Kata sandi minimal {minimal} karakter.')
    if len(sandi) > 128:
        raise galat(400, 'Kata sandi terlalu panjang.')
    return sandi


def cek_nama_kelas(nama: str) -> str:
    nama = ' '.join(nama.split())
    if not 1 <= len(nama) <= 60:
        raise galat(400, 'Nama kelas harus 1 sampai 60 huruf.')
    return nama


def ip(request: Request) -> str:
    terusan = request.headers.get('x-forwarded-for', '')
    return terusan.split(',')[0].strip() if terusan else (request.client.host if request.client else '?')


# ------------------------------------------------------------------ sesi dan pengguna aktif
def cookie_aman(request: Request) -> bool:
    atur = os.environ.get('COOKIE_AMAN', '').strip()
    if atur in ('0', '1'):
        return atur == '1'
    return request.url.scheme == 'https' or request.headers.get('x-forwarded-proto', '') == 'https'


def buka_sesi(con, request: Request, respons: Response, pengguna_id: int) -> None:
    token = token_baru()
    con.execute(insert(bd.sesi).values(
        token_hash=hash_token(token), pengguna_id=pengguna_id,
        dibuat=bd.iso(bd.sekarang()), kedaluwarsa=bd.iso_nanti(days=UMUR_SESI_HARI),
    ))
    # bersihkan sesi lama yang sudah kedaluwarsa
    con.execute(delete(bd.sesi).where(bd.sesi.c.kedaluwarsa < bd.iso(bd.sekarang())))
    respons.set_cookie(
        NAMA_COOKIE, token, max_age=UMUR_SESI_HARI * 86400, httponly=True,
        samesite='lax', secure=cookie_aman(request), path='/',
    )


def ambil_token(request: Request) -> str | None:
    token = request.cookies.get(NAMA_COOKIE)
    if token:
        return token
    otorisasi = request.headers.get('authorization', '')
    if otorisasi.lower().startswith('bearer '):
        return otorisasi[7:].strip()
    return None


def pengguna_aktif(request: Request) -> dict:
    token = ambil_token(request)
    if not token:
        raise galat(401, 'Silakan masuk dulu.')
    with mesin.connect() as con:
        baris = con.execute(
            select(bd.pengguna).join(bd.sesi, bd.sesi.c.pengguna_id == bd.pengguna.c.id).where(and_(
                bd.sesi.c.token_hash == hash_token(token),
                bd.sesi.c.kedaluwarsa > bd.iso(bd.sekarang()),
            ))
        ).mappings().first()
    if not baris:
        raise galat(401, 'Sesi sudah berakhir. Silakan masuk lagi.')
    return dict(baris)


def guru_aktif(p: dict = Depends(pengguna_aktif)) -> dict:
    if p['peran'] != 'guru':
        raise galat(403, 'Halaman ini hanya untuk akun guru.')
    return p


def siswa_aktif(p: dict = Depends(pengguna_aktif)) -> dict:
    if p['peran'] != 'siswa':
        raise galat(403, 'Hanya akun siswa yang menyimpan progres permainan.')
    return p


def data_publik(con, p: dict) -> dict:
    info_kelas = None
    if p['kelas_id']:
        k = con.execute(select(bd.kelas.c.id, bd.kelas.c.nama).where(bd.kelas.c.id == p['kelas_id'])).mappings().first()
        if k:
            info_kelas = {'id': k['id'], 'nama': k['nama']}
    return {
        'id': p['id'], 'username': p['username'], 'nama': p['nama'], 'peran': p['peran'],
        'kelas': info_kelas, 'harusGantiSandi': bool(p['harus_ganti_sandi']),
    }


def progres_milik(con, pengguna_id: int) -> dict[str, Any]:
    baris = con.execute(select(bd.progres_level).where(bd.progres_level.c.pengguna_id == pengguna_id)).mappings().all()
    return {b['level_id']: json.loads(b['data']) for b in baris}


# ------------------------------------------------------------------ umum
@app.get('/api/kesehatan')
def kesehatan():
    return {'status': 'ok'}


@app.get('/api/info')
def info():
    return {'daftarGuru': bool(kode_daftar_guru()), 'basisData': mesin.dialect.name}


# ------------------------------------------------------------------ akun
@app.post('/api/akun/masuk')
def masuk(isi: Masuk, request: Request, respons: Response):
    username = isi.username.strip().lower()
    kunci = f'{ip(request)}|{username}'
    if pembatas_masuk.terkunci(kunci) or pembatas_username.terkunci(username):
        raise galat(429, 'Terlalu banyak percobaan masuk. Tunggu 10 menit, lalu coba lagi.')
    with mesin.begin() as con:
        p = con.execute(select(bd.pengguna).where(bd.pengguna.c.username == username)).mappings().first()
        if not p or not cocok_sandi(isi.sandi, p['hash_sandi']):
            if not p:
                cocok_sandi(isi.sandi, HASH_PALSU)
            pembatas_masuk.gagal(kunci)
            pembatas_username.gagal(username)
            raise galat(401, 'Username atau kata sandi salah.')
        pembatas_masuk.reset(kunci)
        p = dict(p)
        con.execute(update(bd.pengguna).where(bd.pengguna.c.id == p['id']).values(terakhir_aktif=bd.iso(bd.sekarang())))
        buka_sesi(con, request, respons, p['id'])
        hasil = {'pengguna': data_publik(con, p)}
        if p['peran'] == 'siswa':
            hasil['progres'] = progres_milik(con, p['id'])
    return hasil


@app.post('/api/akun/daftar-siswa')
def daftar_siswa(isi: DaftarSiswa, request: Request, respons: Response):
    kunci = ip(request)
    if pembatas_kode.terkunci(kunci):
        raise galat(429, 'Terlalu banyak percobaan. Tunggu 10 menit, lalu coba lagi.')
    nama = cek_nama(isi.nama)
    username = cek_username(isi.username)
    sandi = cek_sandi(isi.sandi, 6)
    kode = rapikan_kode(isi.kodeKelas)
    with mesin.begin() as con:
        k = con.execute(select(bd.kelas).where(bd.kelas.c.kode == kode)).mappings().first()
        if not k:
            pembatas_kode.gagal(kunci)
            raise galat(400, 'Kode kelas tidak ditemukan. Periksa lagi kode yang diberikan guru.')
        if not k['pendaftaran_dibuka']:
            raise galat(403, 'Pendaftaran kelas ini sedang ditutup. Minta guru membukanya.')
        if con.execute(select(bd.pengguna.c.id).where(bd.pengguna.c.username == username)).first():
            raise galat(409, 'Username sudah dipakai. Coba username lain.')
        try:
            pid = con.execute(insert(bd.pengguna).values(
                username=username, nama=nama, peran='siswa', hash_sandi=hash_sandi(sandi),
                kelas_id=k['id'], harus_ganti_sandi=False,
                dibuat=bd.iso(bd.sekarang()), terakhir_aktif=bd.iso(bd.sekarang()),
            )).inserted_primary_key[0]
        except IntegrityError:
            raise galat(409, 'Username sudah dipakai. Coba username lain.') from None
        p = con.execute(select(bd.pengguna).where(bd.pengguna.c.id == pid)).mappings().first()
        buka_sesi(con, request, respons, pid)
        return {'pengguna': data_publik(con, dict(p)), 'progres': {}}


@app.post('/api/akun/daftar-guru')
def daftar_guru(isi: DaftarGuru, request: Request, respons: Response):
    rahasia = kode_daftar_guru()
    if not rahasia:
        raise galat(403, 'Pendaftaran guru sedang ditutup. Hubungi pengelola server.')
    kunci = f'guru|{ip(request)}'
    if pembatas_kode.terkunci(kunci):
        raise galat(429, 'Terlalu banyak percobaan. Tunggu 10 menit, lalu coba lagi.')
    if isi.kodeGuru.strip() != rahasia:
        pembatas_kode.gagal(kunci)
        raise galat(403, 'Kode pendaftaran guru salah.')
    nama = cek_nama(isi.nama)
    username = cek_username(isi.username)
    sandi = cek_sandi(isi.sandi, 8)
    with mesin.begin() as con:
        if con.execute(select(bd.pengguna.c.id).where(bd.pengguna.c.username == username)).first():
            raise galat(409, 'Username sudah dipakai. Coba username lain.')
        pid = buat_guru(con, nama, username, sandi)
        p = con.execute(select(bd.pengguna).where(bd.pengguna.c.id == pid)).mappings().first()
        buka_sesi(con, request, respons, pid)
        return {'pengguna': data_publik(con, dict(p))}


def buat_guru(con, nama: str, username: str, sandi: str) -> int:
    """Dipakai juga oleh kelola.py untuk membuat akun guru dari terminal."""
    return con.execute(insert(bd.pengguna).values(
        username=username, nama=nama, peran='guru', hash_sandi=hash_sandi(sandi),
        kelas_id=None, harus_ganti_sandi=False, dibuat=bd.iso(bd.sekarang()),
    )).inserted_primary_key[0]


@app.post('/api/akun/keluar')
def keluar(request: Request, respons: Response):
    token = ambil_token(request)
    if token:
        with mesin.begin() as con:
            con.execute(delete(bd.sesi).where(bd.sesi.c.token_hash == hash_token(token)))
    respons.delete_cookie(NAMA_COOKIE, path='/')
    return {'ok': True}


@app.get('/api/akun/saya')
def saya(p: dict = Depends(pengguna_aktif)):
    with mesin.begin() as con:
        con.execute(update(bd.pengguna).where(bd.pengguna.c.id == p['id']).values(terakhir_aktif=bd.iso(bd.sekarang())))
        hasil = {'pengguna': data_publik(con, p)}
        if p['peran'] == 'siswa':
            hasil['progres'] = progres_milik(con, p['id'])
    return hasil


@app.post('/api/akun/ganti-sandi')
def ganti_sandi(isi: GantiSandi, request: Request, p: dict = Depends(pengguna_aktif)):
    if not cocok_sandi(isi.sandiLama, p['hash_sandi']):
        raise galat(400, 'Kata sandi lama salah.')
    baru = cek_sandi(isi.sandiBaru, 8 if p['peran'] == 'guru' else 6)
    if baru == isi.sandiLama:
        raise galat(400, 'Kata sandi baru harus berbeda dengan yang lama.')
    token = ambil_token(request)
    with mesin.begin() as con:
        con.execute(update(bd.pengguna).where(bd.pengguna.c.id == p['id']).values(hash_sandi=hash_sandi(baru), harus_ganti_sandi=False))
        # sesi di perangkat lain ditutup, sesi yang sedang dipakai tetap
        con.execute(delete(bd.sesi).where(and_(bd.sesi.c.pengguna_id == p['id'], bd.sesi.c.token_hash != hash_token(token or ''))))
    return {'ok': True}


# ------------------------------------------------------------------ progres siswa
@app.put('/api/progres/{level_id}')
def simpan_progres(level_id: str, isi: SimpanProgres, p: dict = Depends(siswa_aktif)):
    if not POLA_LEVEL.match(level_id):
        raise galat(400, 'Nomor level tidak dikenal.')
    teks = json.dumps(isi.data, ensure_ascii=False)
    if len(teks.encode('utf-8')) > BATAS_DATA_PROGRES:
        raise galat(413, 'Data progres terlalu besar.')
    waktu = bd.iso(bd.sekarang())
    perintah = bd.insert_upsert(mesin)(bd.progres_level).values(pengguna_id=p['id'], level_id=level_id, data=teks, diperbarui=waktu)
    perintah = perintah.on_conflict_do_update(index_elements=['pengguna_id', 'level_id'], set_={'data': teks, 'diperbarui': waktu})
    with mesin.begin() as con:
        con.execute(perintah)
        con.execute(update(bd.pengguna).where(bd.pengguna.c.id == p['id']).values(terakhir_aktif=waktu))
    return {'ok': True, 'diperbarui': waktu}


# ------------------------------------------------------------------ guru: kelas
def kelas_milik(con, guru: dict, kelas_id: int) -> dict:
    k = con.execute(select(bd.kelas).where(and_(bd.kelas.c.id == kelas_id, bd.kelas.c.guru_id == guru['id']))).mappings().first()
    if not k:
        raise galat(404, 'Kelas tidak ditemukan.')
    return dict(k)


def data_kelas(k: dict, jumlah: int) -> dict:
    return {
        'id': k['id'], 'nama': k['nama'], 'kode': k['kode'],
        'pendaftaranDibuka': bool(k['pendaftaran_dibuka']), 'jumlahSiswa': jumlah, 'dibuat': k['dibuat'],
    }


def kode_unik(con) -> str:
    while True:
        kode = kode_kelas_baru()
        if not con.execute(select(bd.kelas.c.id).where(bd.kelas.c.kode == kode)).first():
            return kode


@app.get('/api/guru/kelas')
def daftar_kelas(guru: dict = Depends(guru_aktif)):
    with mesin.connect() as con:
        jumlah = dict(con.execute(
            select(bd.pengguna.c.kelas_id, func.count()).where(bd.pengguna.c.peran == 'siswa').group_by(bd.pengguna.c.kelas_id)
        ).all())
        semua = con.execute(select(bd.kelas).where(bd.kelas.c.guru_id == guru['id']).order_by(bd.kelas.c.id)).mappings().all()
    return {'kelas': [data_kelas(dict(k), jumlah.get(k['id'], 0)) for k in semua]}


@app.post('/api/guru/kelas')
def buat_kelas(isi: KelasBaru, guru: dict = Depends(guru_aktif)):
    nama = cek_nama_kelas(isi.nama)
    with mesin.begin() as con:
        kid = con.execute(insert(bd.kelas).values(
            nama=nama, kode=kode_unik(con), guru_id=guru['id'], pendaftaran_dibuka=True, dibuat=bd.iso(bd.sekarang()),
        )).inserted_primary_key[0]
        return {'kelas': data_kelas(kelas_milik(con, guru, kid), 0)}


@app.patch('/api/guru/kelas/{kelas_id}')
def ubah_kelas(kelas_id: int, isi: UbahKelas, guru: dict = Depends(guru_aktif)):
    with mesin.begin() as con:
        kelas_milik(con, guru, kelas_id)
        nilai: dict[str, Any] = {}
        if isi.nama is not None:
            nilai['nama'] = cek_nama_kelas(isi.nama)
        if isi.pendaftaranDibuka is not None:
            nilai['pendaftaran_dibuka'] = isi.pendaftaranDibuka
        if isi.kodeBaru:
            nilai['kode'] = kode_unik(con)
        if nilai:
            con.execute(update(bd.kelas).where(bd.kelas.c.id == kelas_id).values(**nilai))
        jumlah = con.execute(select(func.count()).select_from(bd.pengguna).where(bd.pengguna.c.kelas_id == kelas_id)).scalar()
        return {'kelas': data_kelas(kelas_milik(con, guru, kelas_id), jumlah)}


@app.delete('/api/guru/kelas/{kelas_id}')
def hapus_kelas(kelas_id: int, guru: dict = Depends(guru_aktif)):
    with mesin.begin() as con:
        kelas_milik(con, guru, kelas_id)
        if con.execute(select(bd.pengguna.c.id).where(bd.pengguna.c.kelas_id == kelas_id).limit(1)).first():
            raise galat(409, 'Kelas masih berisi siswa. Pindahkan atau hapus akun siswanya dulu.')
        con.execute(delete(bd.kelas).where(bd.kelas.c.id == kelas_id))
    return {'ok': True}


@app.get('/api/guru/kelas/{kelas_id}/siswa')
def siswa_kelas(kelas_id: int, guru: dict = Depends(guru_aktif)):
    with mesin.connect() as con:
        k = kelas_milik(con, guru, kelas_id)
        daftar = con.execute(
            select(bd.pengguna).where(and_(bd.pengguna.c.kelas_id == kelas_id, bd.pengguna.c.peran == 'siswa')).order_by(bd.pengguna.c.nama)
        ).mappings().all()
        ids = [s['id'] for s in daftar]
        progres: dict[int, dict] = {i: {} for i in ids}
        diperbarui: dict[int, dict] = {i: {} for i in ids}
        if ids:
            for b in con.execute(select(bd.progres_level).where(bd.progres_level.c.pengguna_id.in_(ids))).mappings():
                progres[b['pengguna_id']][b['level_id']] = json.loads(b['data'])
                diperbarui[b['pengguna_id']][b['level_id']] = b['diperbarui']
        jumlah = len(ids)
    return {
        'kelas': data_kelas(k, jumlah),
        'sekarang': bd.iso(bd.sekarang()),
        'siswa': [
            {
                'id': s['id'], 'username': s['username'], 'nama': s['nama'],
                'dibuat': s['dibuat'], 'terakhirAktif': s['terakhir_aktif'],
                'harusGantiSandi': bool(s['harus_ganti_sandi']),
                'progres': progres[s['id']], 'diperbarui': diperbarui[s['id']],
            }
            for s in daftar
        ],
    }


# ------------------------------------------------------------------ guru: akun siswa
def siswa_milik(con, guru: dict, siswa_id: int) -> dict:
    s = con.execute(
        select(bd.pengguna).join(bd.kelas, bd.kelas.c.id == bd.pengguna.c.kelas_id).where(and_(
            bd.pengguna.c.id == siswa_id, bd.pengguna.c.peran == 'siswa', bd.kelas.c.guru_id == guru['id'],
        ))
    ).mappings().first()
    if not s:
        raise galat(404, 'Siswa tidak ditemukan di kelas Anda.')
    return dict(s)


@app.post('/api/guru/siswa/{siswa_id}/reset-sandi')
def reset_sandi_siswa(siswa_id: int, guru: dict = Depends(guru_aktif)):
    sementara = sandi_sementara()
    with mesin.begin() as con:
        siswa_milik(con, guru, siswa_id)
        con.execute(update(bd.pengguna).where(bd.pengguna.c.id == siswa_id).values(hash_sandi=hash_sandi(sementara), harus_ganti_sandi=True))
        con.execute(delete(bd.sesi).where(bd.sesi.c.pengguna_id == siswa_id))
    return {'sandiSementara': sementara}


@app.patch('/api/guru/siswa/{siswa_id}')
def ubah_siswa(siswa_id: int, isi: UbahSiswa, guru: dict = Depends(guru_aktif)):
    with mesin.begin() as con:
        siswa_milik(con, guru, siswa_id)
        nilai: dict[str, Any] = {}
        if isi.nama is not None:
            nilai['nama'] = cek_nama(isi.nama)
        if isi.kelasId is not None:
            kelas_milik(con, guru, isi.kelasId)
            nilai['kelas_id'] = isi.kelasId
        if nilai:
            con.execute(update(bd.pengguna).where(bd.pengguna.c.id == siswa_id).values(**nilai))
    return {'ok': True}


@app.delete('/api/guru/siswa/{siswa_id}')
def hapus_siswa(siswa_id: int, guru: dict = Depends(guru_aktif)):
    with mesin.begin() as con:
        siswa_milik(con, guru, siswa_id)
        con.execute(delete(bd.progres_level).where(bd.progres_level.c.pengguna_id == siswa_id))
        con.execute(delete(bd.sesi).where(bd.sesi.c.pengguna_id == siswa_id))
        con.execute(delete(bd.pengguna).where(bd.pengguna.c.id == siswa_id))
    return {'ok': True}


# ------------------------------------------------------------------ frontend hasil build
if FRONTEND_DIST.exists():
    app.mount('/', StaticFiles(directory=FRONTEND_DIST, html=True), name='frontend')
