/* The share pictures are drawn through an SVG, where the system font stack does not resolve the way it does on the
   page, so the saved image came out in a different face. A real web font is fetched once, embedded as data and used
   by both the preview and the picture, so they match. If it cannot be fetched the system stack still works. */

const SHEET = 'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap';
let loading = null;

const dataUrl = blob => new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });

async function build() {
  const sheet = await (await fetch(SHEET)).text();
  /* Only the Latin blocks: they cover every player name on the site. */
  const blocks = sheet.split('/* ').slice(1).filter(block => /^latin(-ext)? \*\//.test(block)).map(block => block.slice(block.indexOf('*/') + 2));
  const files = new Map();
  await Promise.all([...new Set(blocks.flatMap(block => [...block.matchAll(/url\((https:[^)]+)\)/g)].map(match => match[1])))].map(async url => {
    files.set(url, await dataUrl(await (await fetch(url)).blob()));
  }));
  return blocks.map(block => block.replace(/url\((https:[^)]+)\)/g, (_, url) => `url(${files.get(url)})`)).join('\n');
}

/* The @font-face CSS with the font files inlined ('' when unavailable). Also adds it to the page once. */
export function shareFontCSS() {
  loading ??= build().then(css => {
    if (typeof document !== 'undefined' && !document.getElementById('share-font')) {
      const style = document.createElement('style');
      style.id = 'share-font'; style.textContent = css;
      document.head.appendChild(style);
    }
    return css;
  }).catch(() => '');
  return loading;
}
