import { teamCodeOf } from './teams';

/* Stats are from the season that just finished, but fans want to see where a
   player plays now. public/data/<season>/current-teams.json (built from the
   rosters) says; a moved player gets `team` = the new club and `statsTeam` =
   the club his numbers were recorded with. */

const plain = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.']/g, '').replace(/ (jr|sr|ii|iii|iv)$/, '').trim();
let lookup;
export const loadCurrentTeams = () => (lookup ||= fetch('/data/2026-27/current-teams.json').then(response => (response.ok ? response.json() : null)).catch(() => null));

export function withCurrentTeam(player, index) {
  if (!index || player.entityType === 'team') return player;
  const espn = /^espn-(\d+)$/.exec(player.playerId || '')?.[1];
  const code = (espn && index.byEspn[espn]) || index.byBbref[player.playerId] || index.byName[plain(player.playerName)];
  return code && code !== teamCodeOf(player.team) ? {...player, team: code, statsTeam: player.team} : player;
}
