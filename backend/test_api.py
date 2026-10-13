"""Uji API Jejak Kode.

Menjalankan:
    pytest -q                                   (memakai SQLite sementara)
    TEST_DATABASE_URL=postgresql://... pytest   (memakai PostgreSQL, tabel dikosongkan dulu)
"""
import os
import tempfile

_folder = tempfile.mkdtemp()
os.environ['DATABASE_URL'] = os.environ.get('TEST_DATABASE_URL') or f'sqlite:///{_folder}/uji.db'
os.environ['KODE_DAFTAR_GURU'] = 'rahasia-uji'
os.environ['COOKIE_AMAN'] = '0'

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import basisdata as bd  # noqa: E402
import main  # noqa: E402


@pytest.fixture(autouse=True)
def bersih():
    with main.mesin.begin() as con:
        for t in (bd.sesi, bd.progres_level, bd.kelas, bd.pengguna):
            con.execute(t.delete())
    for p in (main.pembatas_masuk, main.pembatas_username, main.pembatas_kode):
        p._catatan.clear()
    yield


def klien():
    return TestClient(main.app)


def daftar_guru(k, username='bu.sari', sandi='rahasia123'):
    r = k.post('/api/akun/daftar-guru', json={'nama': 'Bu Sari', 'username': username, 'sandi': sandi, 'kodeGuru': 'rahasia-uji'})
    assert r.status_code == 200, r.text
    return r.json()['pengguna']


def buat_kelas(k, nama='X PPLG 1'):
    r = k.post('/api/guru/kelas', json={'nama': nama})
    assert r.status_code == 200, r.text
    return r.json()['kelas']


def daftar_siswa(k, kode, username='raka', sandi='bit123'):
    return k.post('/api/akun/daftar-siswa', json={'nama': 'Raka Pratama', 'username': username, 'sandi': sandi, 'kodeKelas': kode})


def test_kesehatan_dan_info():
    k = klien()
    assert k.get('/api/kesehatan').json() == {'status': 'ok'}
    assert k.get('/api/info').json()['daftarGuru'] is True


def test_daftar_guru_butuh_kode():
    k = klien()
    r = k.post('/api/akun/daftar-guru', json={'nama': 'Orang', 'username': 'orang', 'sandi': 'rahasia123', 'kodeGuru': 'salah'})
    assert r.status_code == 403
    g = daftar_guru(k)
    assert g['peran'] == 'guru'
    assert k.get('/api/akun/saya').json()['pengguna']['username'] == 'bu.sari'


def test_alur_kelas_siswa_dan_progres():
    guru = klien()
    daftar_guru(guru)
    kelas = buat_kelas(guru)
    assert len(kelas['kode']) == 6

    siswa = klien()
    # kode boleh diketik huruf kecil dan dengan tanda hubung
    kode_ketik = f"{kelas['kode'][:3].lower()}-{kelas['kode'][3:].lower()}"
    r = daftar_siswa(siswa, kode_ketik)
    assert r.status_code == 200, r.text
    assert r.json()['pengguna']['kelas']['nama'] == 'X PPLG 1'

    data = {'fase': 'investigasi', 'lkpd': {'alasan': 'karena pungut dua kali'}}
    assert siswa.put('/api/progres/L1', json={'data': data}).status_code == 200
    assert siswa.put('/api/progres/L1', json={'data': {**data, 'fase': 'kesimpulan'}}).status_code == 200
    assert siswa.get('/api/akun/saya').json()['progres']['L1']['fase'] == 'kesimpulan'

    d = guru.get(f"/api/guru/kelas/{kelas['id']}/siswa").json()
    assert d['kelas']['jumlahSiswa'] == 1
    assert d['siswa'][0]['username'] == 'raka'
    assert d['siswa'][0]['progres']['L1']['lkpd']['alasan'] == 'karena pungut dua kali'
    assert guru.get('/api/guru/kelas').json()['kelas'][0]['jumlahSiswa'] == 1


def test_hak_akses():
    anon = klien()
    assert anon.get('/api/guru/kelas').status_code == 401
    assert anon.put('/api/progres/L1', json={'data': {}}).status_code == 401

    guru = klien()
    daftar_guru(guru)
    kelas = buat_kelas(guru)
    siswa = klien()
    assert daftar_siswa(siswa, kelas['kode']).status_code == 200
    assert siswa.get('/api/guru/kelas').status_code == 403
    assert siswa.get(f"/api/guru/kelas/{kelas['id']}/siswa").status_code == 403
    assert guru.put('/api/progres/L1', json={'data': {}}).status_code == 403

    guru2 = klien()
    daftar_guru(guru2, username='pak.darto')
    assert guru2.get(f"/api/guru/kelas/{kelas['id']}/siswa").status_code == 404
    sid = guru.get(f"/api/guru/kelas/{kelas['id']}/siswa").json()['siswa'][0]['id']
    assert guru2.post(f'/api/guru/siswa/{sid}/reset-sandi').status_code == 404
    assert guru2.delete(f'/api/guru/siswa/{sid}').status_code == 404


def test_pendaftaran_ditutup_dan_username_ganda():
    guru = klien()
    daftar_guru(guru)
    kelas = buat_kelas(guru)
    assert daftar_siswa(klien(), kelas['kode']).status_code == 200
    assert daftar_siswa(klien(), kelas['kode']).status_code == 409
    assert daftar_siswa(klien(), 'ZZZZZZ', username='lain').status_code == 400
    guru.patch(f"/api/guru/kelas/{kelas['id']}", json={'pendaftaranDibuka': False})
    assert daftar_siswa(klien(), kelas['kode'], username='nara').status_code == 403
    # kode baru: kode lama tidak berlaku lagi
    baru = guru.patch(f"/api/guru/kelas/{kelas['id']}", json={'pendaftaranDibuka': True, 'kodeBaru': True}).json()['kelas']
    assert baru['kode'] != kelas['kode']
    assert daftar_siswa(klien(), kelas['kode'], username='nara').status_code == 400
    assert daftar_siswa(klien(), baru['kode'], username='nara').status_code == 200


def test_isian_tidak_valid():
    guru = klien()
    daftar_guru(guru)
    kelas = buat_kelas(guru)
    assert daftar_siswa(klien(), kelas['kode'], username='A b').status_code == 400
    assert daftar_siswa(klien(), kelas['kode'], sandi='123').status_code == 400
    siswa = klien()
    daftar_siswa(siswa, kelas['kode'])
    assert siswa.put('/api/progres/level1', json={'data': {}}).status_code == 400
    assert siswa.put('/api/progres/L1', json={'data': {'x': 'a' * 210_000}}).status_code == 413


def test_masuk_salah_dan_dibatasi():
    guru = klien()
    daftar_guru(guru)
    k = klien()
    assert k.post('/api/akun/masuk', json={'username': 'bu.sari', 'sandi': 'salah'}).status_code == 401
    assert k.post('/api/akun/masuk', json={'username': 'tidak.ada', 'sandi': 'salah'}).status_code == 401
    r = k.post('/api/akun/masuk', json={'username': 'BU.SARI', 'sandi': 'rahasia123'})
    assert r.status_code == 200 and r.json()['pengguna']['peran'] == 'guru'
    for _ in range(8):
        k.post('/api/akun/masuk', json={'username': 'bu.sari', 'sandi': 'salah'})
    assert k.post('/api/akun/masuk', json={'username': 'bu.sari', 'sandi': 'rahasia123'}).status_code == 429


def test_batas_username_walau_ip_berganti():
    guru = klien()
    daftar_guru(guru)
    k = klien()
    for i in range(20):
        k.post('/api/akun/masuk', json={'username': 'bu.sari', 'sandi': 'salah'}, headers={'x-forwarded-for': f'10.0.0.{i}'})
    r = k.post('/api/akun/masuk', json={'username': 'bu.sari', 'sandi': 'rahasia123'}, headers={'x-forwarded-for': '10.0.0.99'})
    assert r.status_code == 429


def test_jawaban_api_tidak_boleh_dicache():
    r = klien().get('/api/info')
    assert r.headers['cache-control'] == 'no-store'
    assert r.headers['cdn-cache-control'] == 'no-store'


def test_reset_dan_ganti_sandi():
    guru = klien()
    daftar_guru(guru)
    kelas = buat_kelas(guru)
    siswa = klien()
    daftar_siswa(siswa, kelas['kode'])
    sid = guru.get(f"/api/guru/kelas/{kelas['id']}/siswa").json()['siswa'][0]['id']
    sementara = guru.post(f'/api/guru/siswa/{sid}/reset-sandi').json()['sandiSementara']
    # sesi lama siswa ditutup
    assert siswa.get('/api/akun/saya').status_code == 401
    k = klien()
    assert k.post('/api/akun/masuk', json={'username': 'raka', 'sandi': 'bit123'}).status_code == 401
    r = k.post('/api/akun/masuk', json={'username': 'raka', 'sandi': sementara})
    assert r.status_code == 200 and r.json()['pengguna']['harusGantiSandi'] is True
    assert k.post('/api/akun/ganti-sandi', json={'sandiLama': 'salah', 'sandiBaru': 'baru123'}).status_code == 400
    assert k.post('/api/akun/ganti-sandi', json={'sandiLama': sementara, 'sandiBaru': 'baru123'}).status_code == 200
    assert k.get('/api/akun/saya').json()['pengguna']['harusGantiSandi'] is False


def test_hapus_kelas_dan_siswa_serta_keluar():
    guru = klien()
    daftar_guru(guru)
    kelas = buat_kelas(guru)
    kelas2 = buat_kelas(guru, 'X PPLG 2')
    siswa = klien()
    daftar_siswa(siswa, kelas['kode'])
    siswa.put('/api/progres/L1', json={'data': {'fase': 'orientasi'}})
    sid = guru.get(f"/api/guru/kelas/{kelas['id']}/siswa").json()['siswa'][0]['id']
    assert guru.delete(f"/api/guru/kelas/{kelas['id']}").status_code == 409
    # pindah kelas
    assert guru.patch(f'/api/guru/siswa/{sid}', json={'kelasId': kelas2['id'], 'nama': 'Raka P.'}).status_code == 200
    assert guru.delete(f"/api/guru/kelas/{kelas['id']}").status_code == 200
    d = guru.get(f"/api/guru/kelas/{kelas2['id']}/siswa").json()
    assert d['siswa'][0]['nama'] == 'Raka P.'
    assert guru.delete(f'/api/guru/siswa/{sid}').status_code == 200
    assert siswa.get('/api/akun/saya').status_code == 401
    assert guru.post('/api/akun/keluar').status_code == 200
    assert guru.get('/api/akun/saya').status_code == 401
