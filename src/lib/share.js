import { toBlob } from 'html-to-image';
import { SITE } from './routes';

/* Turns a rendered .sc-card into a PNG and hands it to the person: the phone's
   share sheet when it can take files (Instagram, Messages, X, WhatsApp...), a
   download otherwise. The caption always carries the page link. */

/* The address on cards and in share captions is the one the person is on. The
   build-time SITE_URL is not visible to browser code, so it would otherwise
   fall back to a placeholder domain. */
export const siteOrigin = () => (typeof window !== 'undefined' ? window.location.origin : SITE);
export const siteHost = () => siteOrigin().replace(/^https?:\/\//, '');
export const CARD_SIZE = 1080;

const mix = (hex, other, amount) => {
  const parse = value => [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16));
  const [a, b] = [parse(hex), parse(other)];
  return `#${a.map((channel, index) => Math.round(channel * (1 - amount) + b[index] * amount).toString(16).padStart(2, '0')).join('')}`;
};
const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(channel => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/* Team colours are picked for white backgrounds; on the card's dark ground a
   near-black or deep navy would vanish, so lift anything too dark. */
export function onDark(color = '#3b3b45') {
  const hex = /^#[0-9a-f]{6}$/i.test(color) ? color : '#3b3b45';
  return luminance(hex) < 0.14 ? mix(hex, '#ffffff', Math.min(0.7, 0.3 + (0.14 - luminance(hex)) * 3)) : hex;
}

/* Safari (iOS above all) leaves cross-origin pictures out of an exported card unless they are already inlined, and html-to-image
   would otherwise download each one again while it draws. So every <img> is fetched once, turned into a data URL and decoded
   before the capture. A picture that cannot be fetched is left as it was (its initials show instead). */
const toDataUrl = blob => new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => resolve(null); reader.readAsDataURL(blob); });
/* Safari keeps a picture it first loaded without CORS and then answers a CORS fetch for the same address from that cached copy, which has no
   permission header, so the fetch failed and the picture came out blank. Other sites' pictures are therefore read through this site's own
   /api/img first (same origin, no permission needed); a direct fetch is the fallback. */
const grab = async source => {
  const attempt = async (url, cache) => { const response = await fetch(url, {cache}); return response.ok ? toDataUrl(await response.blob()) : null; };
  const external = new URL(source, location.href).origin !== location.origin;
  if (external) { try { const viaSite = await attempt(`/api/img?u=${encodeURIComponent(source)}`, 'force-cache'); if (viaSite) return viaSite; } catch { /* try direct */ } }
  try { return await attempt(source, external ? 'no-store' : 'force-cache'); } catch { return null; }
};
export async function inlineImages(node) {
  await Promise.all([...node.querySelectorAll('img')].map(async image => {
    const source = image.currentSrc || image.src;
    if (!source || source.startsWith('data:')) return;
    const url = await grab(source);
    if (!url) return;
    image.removeAttribute('srcset');
    image.src = url;
    await image.decode?.().catch(() => {});
  }));
}

export async function cardFile(node, filename) {
  if (document.fonts?.ready) await document.fonts.ready;
  await inlineImages(node);
  const blob = await toBlob(node, {pixelRatio: 1, width: CARD_SIZE, height: CARD_SIZE, backgroundColor: '#0c0d10'});
  if (!blob) throw new Error('Could not render the card');
  return new File([blob], `${filename}.png`, {type: 'image/png'});
}

/* Resolves to 'shared', 'saved', 'cancelled', or 'blocked': the phone refused the share sheet because making the picture took
   longer than the tap stayed valid (iOS). onFile gets the finished picture either way, so a second tap can share it at once. */
export async function shareCard(node, {filename, title, text, url, onFile}) {
  const file = await cardFile(node, filename);
  onFile?.(file);
  return shareFile(file, {title, text, url});
}

export async function shareFile(file, {title, text, url}) {
  const message = `${text}\n${url}`;
  if (navigator.canShare?.({files: [file]})) {
    try {
      await navigator.share({files: [file], title, text: message});
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      if (error?.name === 'NotAllowedError') return 'blocked';
      // any other failure: fall through to a download
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  try { await navigator.clipboard?.writeText(url); } catch { /* clipboard blocked: the image still saved */ }
  return 'saved';
}
