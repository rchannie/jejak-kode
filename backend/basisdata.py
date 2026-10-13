"""Lapisan basis data Jejak Kode.

Satu kode untuk dua jenis basis data:
- SQLite (bawaan). Cocok untuk server di laptop guru atau lab sekolah.
  Datanya tersimpan di file backend/jejak_kode.db.
- PostgreSQL. Dipakai saat di-deploy online (misalnya Railway + Supabase), karena
  server di hosting tidak menyimpan file secara permanen.

Pilihannya diatur lewat variabel lingkungan DATABASE_URL. Jika kosong,
SQLite yang dipakai.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
    event,
)
from sqlalchemy.engine import Engine

FOLDER = Path(__file__).resolve().parent
metadata = MetaData()

# ------------------------------------------------------------------ tabel
# Akun guru dan siswa. Siswa terhubung ke satu kelas, guru tidak.
pengguna = Table(
    'pengguna', metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('username', String(40), nullable=False, unique=True),
    Column('nama', String(80), nullable=False),
    Column('peran', String(10), nullable=False),  # 'guru' atau 'siswa'
    Column('hash_sandi', String(200), nullable=False),
    Column('kelas_id', Integer, nullable=True, index=True),
    Column('harus_ganti_sandi', Boolean, nullable=False, default=False),
    Column('dibuat', String(32), nullable=False),
    Column('terakhir_aktif', String(32), nullable=True),
)

# Kelas milik seorang guru. Siswa mendaftar memakai kode kelas.
kelas = Table(
    'kelas', metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('nama', String(60), nullable=False),
    Column('kode', String(16), nullable=False, unique=True),
    Column('guru_id', Integer, ForeignKey('pengguna.id', ondelete='CASCADE'), nullable=False, index=True),
    Column('pendaftaran_dibuka', Boolean, nullable=False, default=True),
    Column('dibuat', String(32), nullable=False),
)

# Sesi masuk. Yang disimpan hanya hash token, bukan token aslinya.
sesi = Table(
    'sesi', metadata,
    Column('token_hash', String(64), primary_key=True),
    Column('pengguna_id', Integer, ForeignKey('pengguna.id', ondelete='CASCADE'), nullable=False, index=True),
    Column('dibuat', String(32), nullable=False),
    Column('kedaluwarsa', String(32), nullable=False),
)

# Progres setiap siswa per level, termasuk isi LKPD, dalam bentuk JSON.
progres_level = Table(
    'progres_level', metadata,
    Column('pengguna_id', Integer, ForeignKey('pengguna.id', ondelete='CASCADE'), primary_key=True),
    Column('level_id', String(8), primary_key=True),
    Column('data', Text, nullable=False),
    Column('diperbarui', String(32), nullable=False),
)

meta = Table(
    'meta', metadata,
    Column('kunci', String(40), primary_key=True),
    Column('nilai', Text, nullable=False),
)


# ------------------------------------------------------------------ koneksi
def url_database() -> str:
    url = os.environ.get('DATABASE_URL', '').strip()
    if not url:
        jalur = Path(os.environ.get('JEJAK_DB', FOLDER / 'jejak_kode.db'))
        return f'sqlite:///{jalur}'
    # Supabase, Neon, dan Railway memberi alamat berawalan postgres:// atau
    # postgresql://. SQLAlchemy perlu tahu driver yang dipakai (psycopg 3).
    for awalan in ('postgres://', 'postgresql://'):
        if url.startswith(awalan):
            return 'postgresql+psycopg://' + url[len(awalan):]
    return url


def buat_mesin(url: str | None = None) -> Engine:
    url = url or url_database()
    if url.startswith('sqlite'):
        mesin = create_engine(url, connect_args={'check_same_thread': False})

        @event.listens_for(mesin, 'connect')
        def _aktifkan_fk(con, _):  # SQLite baru menegakkan foreign key jika diminta
            cur = con.cursor()
            cur.execute('PRAGMA foreign_keys = ON')
            cur.close()

        return mesin
    # prepare_threshold=None: tanpa prepared statement di server, supaya tetap aman
    # saat memakai connection pooler (Supabase Supavisor atau PgBouncer di Neon).
    argumen = {'prepare_threshold': None}
    # Di Railway, koneksi yang menganggur bisa membuat fitur Serverless (server tidur
    # saat tidak dipakai) tidak pernah aktif. Jadi setiap permintaan membuka koneksi
    # baru ke pooler Supabase. Atur DB_POOL=1 untuk tetap memakai kolam koneksi.
    atur = os.environ.get('DB_POOL', '').strip()
    if atur == '0' or (atur != '1' and os.environ.get('RAILWAY_ENVIRONMENT')):
        from sqlalchemy.pool import NullPool
        return create_engine(url, poolclass=NullPool, connect_args=argumen)
    # Ukuran pool kecil supaya muat di batas koneksi pooler Supabase/Neon paket gratis.
    return create_engine(url, pool_pre_ping=True, pool_size=4, max_overflow=4, pool_recycle=300, connect_args=argumen)


def siapkan(mesin: Engine) -> None:
    metadata.create_all(mesin)
    if mesin.dialect.name == 'postgresql':
        # Supabase otomatis membuka tabel di skema public lewat Data API (REST)
        # untuk siapa pun yang memegang anon key. Row Level Security tanpa policy
        # menutup jalur itu. Server Jejak Kode tetap bisa membaca dan menulis
        # karena terhubung sebagai pemilik tabel.
        from sqlalchemy import text
        with mesin.begin() as con:
            for t in metadata.sorted_tables:
                con.execute(text(f'ALTER TABLE {t.name} ENABLE ROW LEVEL SECURITY'))


def insert_upsert(mesin: Engine):
    """INSERT yang bisa diberi ON CONFLICT DO UPDATE, sesuai jenis basis data."""
    if mesin.dialect.name == 'postgresql':
        from sqlalchemy.dialects.postgresql import insert as ins
    else:
        from sqlalchemy.dialects.sqlite import insert as ins
    return ins


# ------------------------------------------------------------------ waktu
def sekarang() -> datetime:
    return datetime.now(timezone.utc)


def iso(waktu: datetime) -> str:
    return waktu.isoformat(timespec='seconds')


def iso_nanti(**selisih) -> str:
    return iso(sekarang() + timedelta(**selisih))
