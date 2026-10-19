import { TEAMS } from './teams';

/* Headshots for the share cards. NBA.com's image server sends no cross-origin
   permission, so a browser can show its photos but cannot copy them into an
   exported picture. ESPN's can, so cards use ESPN headshots, found from the
   player's ESPN id: it is in the player id on ESPN-sourced stats (espn-123),
   otherwise it comes from the roster files by name. */

const plain = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.']/g, '').replace(/ (jr|sr|ii|iii|iv)$/, '').trim();
let index = null;
const rosterIndex = () => (index ||= Promise.all(Object.keys(TEAMS).map(code => fetch(`/data/2026-27/rosters/${code}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null)))
  .then(files => {
    const byName = new Map();
    files.forEach(file => file?.players?.forEach(player => player.espnId && byName.set(plain(player.name), player.espnId)));
    return byName;
  }));

export const photoUrl = id => (id ? `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=350&h=254` : null);

/* person: {name, playerId, espnId?}. Resolves to a photo URL, or null when ESPN has no id for them. */
export async function photoFor(person) {
  if (!person) return null;
  if (person.espnId) return photoUrl(person.espnId);
  const direct = /^espn-(\d+)$/.exec(person.playerId || '');
  if (direct) return photoUrl(direct[1]);
  return photoUrl((await rosterIndex()).get(plain(person.name)));
}

/* Fills in `photo` URLs on a card spec from its `person` entries (the spec's
   own, or each row's), leaving the rest untouched. */
export async function withPhotos(spec) {
  const next = {...spec};
  if (spec.people) next.photos = await Promise.all(spec.people.map(photoFor));
  if (spec.person) next.photo = await photoFor(spec.person);
  if (spec.rows?.some(row => row.person)) next.rows = await Promise.all(spec.rows.map(async row => (row.person ? {...row, photo: await photoFor(row.person)} : row)));
  return next;
}
