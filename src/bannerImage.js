// Shared framing (zoom + position) for full uploaded banner/tile images.
export function bannerFraming(settings = {}, prefix = "image") {
  const num = (v, d, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
  return { zoom: num(settings[`${prefix}Zoom`], 1, 1, 3), x: num(settings[`${prefix}PosX`], 50, 0, 100), y: num(settings[`${prefix}PosY`], 50, 0, 100) };
}

export function bannerImageStyle(settings, prefix = "image") {
  const { zoom, x, y } = bannerFraming(settings, prefix);
  return { objectFit: "cover", objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` };
}
