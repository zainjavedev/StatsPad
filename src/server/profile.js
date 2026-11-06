import { sql } from './db';

/* Public profile on an account: a display name and a photo, shown on the predictor leaderboard. The photo is either the
   Google picture (an https URL) or a small JPEG the person uploaded (a data URL, at most PHOTO_MAX characters). */
export const NAME_MAX = 24, PHOTO_MAX = 60000;
let ready;
export const ensureProfile = () => (ready ??= (async () => {
  await sql`alter table subscribers add column if not exists display_name text`;
  await sql`alter table subscribers add column if not exists photo text`;
})().catch(error => { ready = undefined; throw error; }));

export const cleanName = value => [...String(value ?? '')].filter(char => char >= ' ' && char !== '<' && char !== '>').join('').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
export const validPhoto = value => value === null || (typeof value === 'string' && value.length <= PHOTO_MAX && (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) || /^https:\/\/lh\d\.googleusercontent\.com\//.test(value)));

/* What the page shows for a photo: Google's address as is, an uploaded one through /api/avatar (so lists stay small). */
export const photoUrl = (id, photo) => (!photo ? null : photo.startsWith('https://') ? photo : `/api/avatar/${id}?v=${photo.length.toString(36)}${photo.slice(-6).replace(/[^A-Za-z0-9]/g, '')}`);
