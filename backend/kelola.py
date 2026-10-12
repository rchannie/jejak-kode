"""Pengelolaan akun dari terminal (untuk pengelola server).

Contoh:
    python kelola.py buat-guru            membuat akun guru (ditanya nama, username, sandi)
    python kelola.py reset-sandi budi     mengganti kata sandi akun 'budi'
    python kelola.py daftar               menampilkan semua akun guru dan jumlah siswa

Perintah ini memakai basis data yang sama dengan server (DATABASE_URL di .env
atau variabel lingkungan, atau SQLite lokal jika kosong).
"""
from __future__ import annotations

import getpass
import sys

from sqlalchemy import func, select, update

import main
import basisdata as bd
from keamanan import hash_sandi


def tanya(label: str) -> str:
    nilai = input(f'{label}: ').strip()
    if not nilai:
        sys.exit(f'{label} tidak boleh kosong.')
    return nilai


def tanya_sandi(minimal: int) -> str:
    sandi = getpass.getpass(f'Kata sandi (minimal {minimal} karakter): ')
    if sandi != getpass.getpass('Ulangi kata sandi: '):
        sys.exit('Kata sandi tidak sama.')
    try:
        return main.cek_sandi(sandi, minimal)
    except main.HTTPException as e:
        sys.exit(e.detail)


def buat_guru() -> None:
    try:
        nama = main.cek_nama(tanya('Nama lengkap guru'))
        username = main.cek_username(tanya('Username'))
    except main.HTTPException as e:
        sys.exit(e.detail)
    sandi = tanya_sandi(8)
    with main.mesin.begin() as con:
        if con.execute(select(bd.pengguna.c.id).where(bd.pengguna.c.username == username)).first():
            sys.exit('Username sudah dipakai.')
        main.buat_guru(con, nama, username, sandi)
    print(f'Akun guru "{username}" dibuat. Silakan masuk di halaman awal game.')


def reset_sandi(username: str) -> None:
    username = username.strip().lower()
    with main.mesin.begin() as con:
        p = con.execute(select(bd.pengguna).where(bd.pengguna.c.username == username)).mappings().first()
        if not p:
            sys.exit(f'Akun "{username}" tidak ditemukan.')
        sandi = tanya_sandi(8 if p['peran'] == 'guru' else 6)
        con.execute(update(bd.pengguna).where(bd.pengguna.c.id == p['id']).values(hash_sandi=hash_sandi(sandi), harus_ganti_sandi=False))
        con.execute(bd.sesi.delete().where(bd.sesi.c.pengguna_id == p['id']))
    print(f'Kata sandi "{username}" sudah diganti.')


def daftar() -> None:
    with main.mesin.connect() as con:
        guru = con.execute(select(bd.pengguna).where(bd.pengguna.c.peran == 'guru').order_by(bd.pengguna.c.id)).mappings().all()
        siswa = con.execute(select(func.count()).select_from(bd.pengguna).where(bd.pengguna.c.peran == 'siswa')).scalar()
        jml_kelas = con.execute(select(func.count()).select_from(bd.kelas)).scalar()
    print(f'Basis data: {main.mesin.dialect.name}')
    print(f'{len(guru)} guru, {jml_kelas} kelas, {siswa} siswa')
    for g in guru:
        print(f'  - {g["username"]} ({g["nama"]})')


if __name__ == '__main__':
    perintah = sys.argv[1] if len(sys.argv) > 1 else ''
    if perintah == 'buat-guru':
        buat_guru()
    elif perintah == 'reset-sandi' and len(sys.argv) > 2:
        reset_sandi(sys.argv[2])
    elif perintah == 'daftar':
        daftar()
    else:
        print(__doc__)
