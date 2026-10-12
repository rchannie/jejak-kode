import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { pulihkan, toko } from './data/store.js';
import './styles.css';

function mulai(data) {
  pulihkan(data);
  // Jika halaman diperbarui saat sedang dimainkan, keadaan permainan dipertahankan.
  if (window.claude && window.claude.hot) window.claude.hot.snapshot(() => toko.ambil());
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(mulai);
else mulai((hot && hot.data) || {});
