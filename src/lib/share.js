import { toBlob } from 'html-to-image';
import { SITE } from './routes';

/* Turns a rendered .sc-card into a PNG and hands it to the person: the phone's
   share sheet when it can take files (Instagram, Messages, X, WhatsApp...), a
   download otherwise. The caption always carries the page link. */

export const SITE_HOST = SITE.replace(/^https?:\/\//, '');
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

export async function cardFile(node, filename) {
  if (document.fonts?.ready) await document.fonts.ready;
  const blob = await toBlob(node, {pixelRatio: 1, width: CARD_SIZE, height: CARD_SIZE, backgroundColor: '#0c0d10'});
  if (!blob) throw new Error('Could not render the card');
  return new File([blob], `${filename}.png`, {type: 'image/png'});
}

/* Resolves to 'shared', 'saved' or 'cancelled'. */
export async function shareCard(node, {filename, title, text, url}) {
  const file = await cardFile(node, filename);
  const message = `${text}\n${url}`;
  if (navigator.canShare?.({files: [file]})) {
    try {
      await navigator.share({files: [file], title, text: message});
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
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
