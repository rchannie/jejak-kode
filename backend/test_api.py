"""Uji backend: pytest test_api.py"""
import os
import tempfile

os.environ['JEJAK_DB'] = os.path.join(tempfile.mkdtemp(), 'uji.db')

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402

klien = TestClient(app)


def test_alur_lengkap():
    assert klien.get('/api/kesehatan').json() == {'status': 'ok'}

    r = klien.post('/api/siswa', json={'nama': 'Raka Pratama', 'kelas': 'X PPLG 1'})
    assert r.status_code == 200
    sid = r.json()['id']

    data = {'fase': 'investigasi', 'tebakan': 'c', 'tebakanBenar': False, 'jalankan': 2}
    assert klien.post('/api/progres', json={'siswa_id': sid, 'level_id': 'L1', 'data': data}).json() == {'ok': True}
    data['fase'] = 'kesimpulan'
    klien.post('/api/progres', json={'siswa_id': sid, 'level_id': 'L1', 'data': data})

    d = klien.get('/api/dasbor').json()
    siswa = [s for s in d['siswa'] if s['id'] == sid][0]
    assert siswa['progres']['L1']['fase'] == 'kesimpulan'
    assert siswa['progres']['L1']['tebakan'] == 'c'

    d2 = klien.get('/api/dasbor', params={'kelas': 'X PPLG 2'}).json()
    assert all(s['kelas'] == 'X PPLG 2' for s in d2['siswa'])


def test_validasi():
    assert klien.post('/api/siswa', json={'nama': 'A', 'kelas': 'X'}).status_code == 422
    assert klien.post('/api/progres', json={'siswa_id': 99999, 'level_id': 'L1', 'data': {}}).status_code == 404
    r = klien.post('/api/siswa', json={'nama': 'Sinta', 'kelas': 'X PPLG 1'})
    sid = r.json()['id']
    assert klien.post('/api/progres', json={'siswa_id': sid, 'level_id': 'level1', 'data': {}}).status_code == 422
    assert klien.delete(f'/api/siswa/{sid}').json() == {'ok': True}


def test_geser_nomor_level_lama(tmp_path, monkeypatch):
    """Database versi lama (level L1-L4) dipindahkan ke nomor baru L3-L6 satu kali saja."""
    import sqlite3

    import main

    jalur = tmp_path / 'lama.db'
    con = sqlite3.connect(jalur)
    con.executescript(
        """
        CREATE TABLE siswa (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL, kelas TEXT NOT NULL, dibuat TEXT NOT NULL);
        CREATE TABLE progres (siswa_id INTEGER NOT NULL, level_id TEXT NOT NULL, data TEXT NOT NULL,
                              diperbarui TEXT NOT NULL, PRIMARY KEY (siswa_id, level_id));
        INSERT INTO siswa VALUES (1, 'Raka', 'X PPLG 1', '2026-10-01');
        INSERT INTO progres VALUES (1, 'L1', '{"fase": "diskusi"}', '2026-10-01');
        INSERT INTO progres VALUES (1, 'L2', '{"fase": "investigasi"}', '2026-10-01');
        INSERT INTO progres VALUES (1, 'L4', '{"fase": "orientasi"}', '2026-10-01');
        """
    )
    con.commit()
    con.close()

    monkeypatch.setattr(main, 'DB_PATH', jalur)
    main.siapkan_db()
    main.siapkan_db()  # dipanggil dua kali: tidak boleh menggeser lagi

    con = sqlite3.connect(jalur)
    hasil = dict(con.execute('SELECT level_id, data FROM progres').fetchall())
    con.close()
    assert set(hasil) == {'L3', 'L4', 'L6'}
    assert '"diskusi"' in hasil['L3'] and '"investigasi"' in hasil['L4'] and '"orientasi"' in hasil['L6']
