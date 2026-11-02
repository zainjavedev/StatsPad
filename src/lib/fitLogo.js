/* Team logos have very different visual weight in the same square: the Celtics' is a solid disc that fills it, the Magic's is a ball
   and a few stars with lots of empty space. Shown at the same size the solid ones look much bigger. This measures how much of the
   square a logo actually paints once it loads and shrinks the heavy ones toward a common weight (and trims empty margins), so a
   pair of logos reads as the same size. ESPN's image server allows reading the pixels; if that ever fails the logo is left as it is. */
const TARGET = 0.42;
const cache = new Map();

function measure(image) {
  const size = 64, canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  context.drawImage(image, 0, 0, size, size);
  const {data} = context.getImageData(0, 0, size, size);
  let top = size, left = size, right = -1, bottom = -1, painted = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (data[(y * size + x) * 4 + 3] > 24) { painted++; if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y; }
  }
  if (right < 0) return null;
  const width = (right - left + 1) / size, height = (bottom - top + 1) / size;
  const fill = 1 / Math.max(width, height), coverage = painted / (size * size) * fill * fill;
  const weight = Math.min(1, Math.sqrt(TARGET / coverage));
  return {scale: Math.min(1.6, fill * weight), x: (0.5 - (left + right + 1) / 2 / size) * 100, y: (0.5 - (top + bottom + 1) / 2 / size) * 100};
}

export function fitLogo(event) {
  const image = event.currentTarget;
  try {
    const key = image.currentSrc || image.src;
    if (!cache.has(key)) cache.set(key, measure(image));
    const fit = cache.get(key);
    if (fit) image.style.transform = `scale(${fit.scale.toFixed(3)}) translate(${fit.x.toFixed(1)}%, ${fit.y.toFixed(1)}%)`;
  } catch { /* the pixels could not be read: keep the logo as drawn */ }
}
