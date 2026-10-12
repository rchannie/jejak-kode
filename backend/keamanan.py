"""Keamanan akun: hash kata sandi, token sesi, kode kelas, dan pembatas percobaan.

Kata sandi di-hash dengan scrypt (bawaan Python), jadi tidak perlu pustaka tambahan.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import re
import secrets
import time
from collections import defaultdict, deque

# ------------------------------------------------------------------ kata sandi
_N, _R, _P = 2 ** 14, 8, 1


def hash_sandi(sandi: str) -> str:
    garam = secrets.token_bytes(16)
    turunan = hashlib.scrypt(sandi.encode('utf-8'), salt=garam, n=_N, r=_R, p=_P, dklen=32)
    b64 = lambda b: base64.b64encode(b).decode('ascii')  # noqa: E731
    return f'scrypt${_N}${_R}${_P}${b64(garam)}${b64(turunan)}'


def cocok_sandi(sandi: str, tersimpan: str) -> bool:
    try:
        jenis, n, r, p, garam, turunan = tersimpan.split('$')
        if jenis != 'scrypt':
            return False
        hasil = hashlib.scrypt(
            sandi.encode('utf-8'), salt=base64.b64decode(garam),
            n=int(n), r=int(r), p=int(p), dklen=len(base64.b64decode(turunan)),
        )
        return hmac.compare_digest(hasil, base64.b64decode(turunan))
    except (ValueError, TypeError):
        return False


# Hash palsu untuk menyamakan lama proses saat username tidak ditemukan.
HASH_PALSU = hash_sandi(secrets.token_urlsafe(12))


# ------------------------------------------------------------------ token sesi
def token_baru() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


# ------------------------------------------------------------------ kode kelas
# Tanpa huruf dan angka yang mudah tertukar, terutama di font pixel
# (0/O/Q, 1/I/L, 2/Z, 5/S, 6/G, 8/B), supaya mudah dibaca dan diketik siswa.
HURUF_KODE = 'ACDEFHJKMNPRTUVWXY3479'


def kode_kelas_baru() -> str:
    return ''.join(secrets.choice(HURUF_KODE) for _ in range(6))


def rapikan_kode(kode: str) -> str:
    """Kode boleh diketik dengan huruf kecil, spasi, atau tanda hubung."""
    return re.sub(r'[^A-Z0-9]', '', kode.upper())


def sandi_sementara() -> str:
    """Sandi sementara saat guru me-reset sandi siswa, misalnya 'bit-4827'."""
    return f'bit-{secrets.randbelow(9000) + 1000}'


# ------------------------------------------------------------------ pembatas percobaan
class Pembatas:
    """Membatasi percobaan gagal (masuk atau kode kelas) per kunci dalam rentang waktu."""

    def __init__(self, maks: int, detik: int):
        self.maks = maks
        self.detik = detik
        self._catatan: dict[str, deque] = defaultdict(deque)

    def _bersihkan(self, kunci: str) -> deque:
        antre = self._catatan[kunci]
        batas = time.monotonic() - self.detik
        while antre and antre[0] < batas:
            antre.popleft()
        return antre

    def terkunci(self, kunci: str) -> bool:
        return len(self._bersihkan(kunci)) >= self.maks

    def gagal(self, kunci: str) -> None:
        self._bersihkan(kunci).append(time.monotonic())

    def reset(self, kunci: str) -> None:
        self._catatan.pop(kunci, None)
