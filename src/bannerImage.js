// Shared framing (zoom + position) for full uploaded banner/tile images.
export function bannerFraming(settings = {}) {
  const num = (v, d, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
  return { zoom: num(settings.imageZoom, 1, 1, 3), x: num(settings.imagePosX, 50, 0, 100), y: num(settings.imagePosY, 50, 0, 100) };
}

export function bannerImageStyle(settings) {
  const { zoom, x, y } = bannerFraming(settings);
  return { objectFit: "cover", objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` };
}
