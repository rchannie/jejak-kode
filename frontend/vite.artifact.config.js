import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build khusus prototipe satu halaman (tanpa backend).
// React dimuat dari CDN, jadi tidak ikut dibundel.
export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],
  esbuild: { jsxInject: "import React from 'react'" },
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.VITE_TANPA_API': '"1"',
    // Lagu dikirim sebagai file terpisah di sebelah halaman (tidak dibundel).
    'import.meta.env.VITE_URL_MUSIK': '"musik/baroque-coffee-house.mp3"',
  },
  publicDir: false,
  build: {
    outDir: 'dist-artifact',
    emptyOutDir: true,
    assetsInlineLimit: 100000,
    cssCodeSplit: false,
    lib: { entry: 'src/main.jsx', name: 'JejakKode', formats: ['iife'], fileName: () => 'jejak-kode.js' },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client'],
      output: { globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM' } },
    },
  },
});
