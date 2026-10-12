// Semua sprite PNG di src/assets/sprites dimuat otomatis.
// Untuk mengganti gambar, timpa file PNG dengan nama yang sama (16x16 piksel).

const berkas = import.meta.glob('../assets/sprites/*.png', { eager: true, import: 'default' });

export const URL_SPRITE = {};
for (const [jalur, url] of Object.entries(berkas)) {
  const nama = jalur.split('/').pop().replace('.png', '');
  URL_SPRITE[nama] = url;
}

let janji = null;
export function muatSprite() {
  if (janji) return janji;
  janji = Promise.all(
    Object.entries(URL_SPRITE).map(([nama, url]) => new Promise((selesai) => {
      const img = new Image();
      img.onload = () => selesai([nama, img]);
      img.onerror = () => selesai([nama, null]);
      img.src = url;
    })),
  ).then((pasangan) => Object.fromEntries(pasangan));
  return janji;
}
