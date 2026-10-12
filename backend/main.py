"""Backend Jejak Kode (FastAPI + SQLite).

Menyimpan data siswa dan progres setiap level supaya guru bisa memantau
tebakan, percobaan, dan temuan siswa lewat dasbor.

Menjalankan:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Jika folder ../frontend/dist sudah ada (hasil `npm run build`), backend ini
juga menyajikan game-nya, jadi cukup buka http://localhost:8000 di browser.
"""
from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

FOLDER = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get('JEJAK_DB', FOLDER / 'jejak_kode.db'))
FRONTEND_DIST = FOLDER.parent / 'frontend' / 'dist'

app = FastAPI(title='Jejak Kode API', version='0.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
    allow_methods=['*'],
    allow_headers=['*'],
)


# ------------------------------------------------------------------ database
@contextmanager
def koneksi():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def siapkan_db() -> None:
    with koneksi() as con:
        con.executescript(
            """
            CREATE TABLE IF NOT EXISTS siswa (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nama TEXT NOT NULL,
                kelas TEXT NOT NULL,
                dibuat TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS progres (
                siswa_id INTEGER NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
                level_id TEXT NOT NULL,
                data TEXT NOT NULL,
                diperbarui TEXT NOT NULL,
                PRIMARY KEY (siswa_id, level_id)
            );
            CREATE TABLE IF NOT EXISTS meta (
                kunci TEXT PRIMARY KEY,
                nilai TEXT NOT NULL
            );
            """
        )
        geser_nomor_level(con)


# Versi 2 menambah dua level dasar di depan, jadi level lama L1-L4 sekarang
# bernomor L3-L6. Progres yang tersimpan dengan nomor lama dipindahkan sekali saja.
VERSI_LEVEL = '2'


def geser_nomor_level(con: sqlite3.Connection) -> None:
    baris = con.execute("SELECT nilai FROM meta WHERE kunci = 'versi_level'").fetchone()
    if baris and baris['nilai'] == VERSI_LEVEL:
        return
    ada_progres = con.execute('SELECT 1 FROM progres LIMIT 1').fetchone()
    if not baris and ada_progres:
        # Diurutkan dari nomor terbesar supaya tidak bertabrakan (L4 -> L6 dulu, baru L3 -> L5, dst).
        for lama in (4, 3, 2, 1):
            con.execute('UPDATE progres SET level_id = ? WHERE level_id = ?', (f'L{lama + 2}', f'L{lama}'))
    con.execute(
        "INSERT INTO meta (kunci, nilai) VALUES ('versi_level', ?) "
        'ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai',
        (VERSI_LEVEL,),
    )


siapkan_db()


def sekarang() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


# ------------------------------------------------------------------ skema
class SiswaBaru(BaseModel):
    nama: str = Field(min_length=2, max_length=80)
    kelas: str = Field(min_length=1, max_length=40)


class Siswa(SiswaBaru):
    id: int


class Progres(BaseModel):
    siswa_id: int
    level_id: str = Field(pattern=r'^L\d{1,2}$')
    data: dict[str, Any]


# ------------------------------------------------------------------ endpoint
@app.get('/api/kesehatan')
def kesehatan():
    return {'status': 'ok'}


@app.post('/api/siswa', response_model=Siswa)
def daftar_siswa(isi: SiswaBaru):
    with koneksi() as con:
        cur = con.execute(
            'INSERT INTO siswa (nama, kelas, dibuat) VALUES (?, ?, ?)',
            (isi.nama.strip(), isi.kelas.strip(), sekarang()),
        )
        return Siswa(id=cur.lastrowid, nama=isi.nama.strip(), kelas=isi.kelas.strip())


@app.post('/api/progres')
def simpan_progres(isi: Progres):
    with koneksi() as con:
        ada = con.execute('SELECT 1 FROM siswa WHERE id = ?', (isi.siswa_id,)).fetchone()
        if not ada:
            raise HTTPException(status_code=404, detail='Siswa tidak ditemukan.')
        con.execute(
            """
            INSERT INTO progres (siswa_id, level_id, data, diperbarui) VALUES (?, ?, ?, ?)
            ON CONFLICT(siswa_id, level_id) DO UPDATE SET data = excluded.data, diperbarui = excluded.diperbarui
            """,
            (isi.siswa_id, isi.level_id, json.dumps(isi.data), sekarang()),
        )
    return {'ok': True}


@app.get('/api/dasbor')
def dasbor(kelas: str | None = None):
    with koneksi() as con:
        if kelas:
            baris_siswa = con.execute('SELECT * FROM siswa WHERE kelas = ? ORDER BY nama', (kelas,)).fetchall()
        else:
            baris_siswa = con.execute('SELECT * FROM siswa ORDER BY kelas, nama').fetchall()
        baris_progres = con.execute('SELECT * FROM progres').fetchall()

    progres_per_siswa: dict[int, dict[str, Any]] = {}
    for p in baris_progres:
        progres_per_siswa.setdefault(p['siswa_id'], {})[p['level_id']] = json.loads(p['data'])

    return {
        'siswa': [
            {
                'id': s['id'],
                'nama': s['nama'],
                'kelas': s['kelas'],
                'progres': progres_per_siswa.get(s['id'], {}),
            }
            for s in baris_siswa
        ]
    }


@app.delete('/api/siswa/{siswa_id}')
def hapus_siswa(siswa_id: int):
    with koneksi() as con:
        con.execute('DELETE FROM progres WHERE siswa_id = ?', (siswa_id,))
        cur = con.execute('DELETE FROM siswa WHERE id = ?', (siswa_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail='Siswa tidak ditemukan.')
    return {'ok': True}


# ------------------------------------------------------------------ frontend hasil build
if FRONTEND_DIST.exists():
    app.mount('/', StaticFiles(directory=FRONTEND_DIST, html=True), name='frontend')
