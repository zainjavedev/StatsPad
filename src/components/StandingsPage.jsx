import React, { useEffect, useState } from 'react';
import { espnLogoUrl, TEAMS } from '../lib/teams';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useFavorites } from '../lib/favorites';

/* Eastern and Western conference tables from ESPN's standings: seed, record, games behind,
   home and road records, last ten, streak and scoring. Seeds 1-6 go straight to the playoffs,
   7-10 to the play-in. */

const URL = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings';
/* ESPN answers a bare request with the preseason until the regular season opens, so ask for the regular season by number. */
const ask = type => fetch(`${URL}?seasontype=${type}`).then(response => response.json());
/* Columns phones can do without. */
const EXTRA = new Set(['Home', 'Road', 'PPG', 'OPP', 'DIFF']);
const COLUMNS = [
  ['W', 'wins'], ['L', 'losses'], ['PCT', 'winPercent'], ['GB', 'gamesBehind'], ['Home', 'Home'], ['Road', 'Road'], ['L10', 'Last Ten Games'], ['Strk', 'streak'], ['PPG', 'avgPointsFor'], ['OPP', 'avgPointsAgainst'], ['DIFF', 'differential'],
];
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());

/* Best record first; teams level on record are split by point difference, then by name. */
export const byRecord = (a, b) => Number(b.stat.winPercent) - Number(a.stat.winPercent) || Number(b.stat.wins) - Number(a.stat.wins) || (Number(b.stat.differential) || 0) - (Number(a.stat.differential) || 0) || TEAMS[a.code].name.localeCompare(TEAMS[b.code].name);

const parse = data => (data.children ?? []).map(group => ({
  name: group.name,
  rows: (group.standings?.entries ?? []).map(entry => {
    const stat = Object.fromEntries(entry.stats.map(item => [item.name, item.displayValue ?? item.value]));
    const code = codeOf(entry.team.abbreviation);
    return {code, seed: Number(stat.playoffSeed) || 99, stat};
  }).filter(row => row.code).sort(byRecord),
}));

export const loadStandings = () => ask(2).then(parse);

/* Any column can be sorted. Values become numbers first: a record like "4-1" by its win share, a streak "W5" as 5 and
   "L2" as -2, games behind "-" as 0. */
const sortValue = (row, key) => {
  if (key === 'team') return TEAMS[row.code].name;
  const raw = String(row.stat[key] ?? '');
  if (/^\d+-\d+$/.test(raw)) { const [w, l] = raw.split('-').map(Number); return w + l ? w / (w + l) + w / 1000 : 0; }
  if (/^[WL]\d+$/.test(raw)) return (raw[0] === 'W' ? 1 : -1) * Number(raw.slice(1));
  return raw === '-' ? 0 : Number(raw.replace('+', '')) || 0;
};
const sortRows = (rows, {key, dir}) => [...rows].sort((a, b) => {
  const x = sortValue(a, key), y = sortValue(b, key), order = typeof x === 'string' ? x.localeCompare(y) : x - y;
  return (dir === 'up' ? order : -order) || byRecord(a, b);
});

/* Both conferences as one table; games behind is recounted from the league leader, since ESPN's is per conference. */
function leagueRows(groups) {
  const rows = groups.flatMap(group => group.rows).sort(byRecord), top = rows[0];
  const behind = row => ((Number(top.stat.wins) - Number(row.stat.wins)) + (Number(row.stat.losses) - Number(top.stat.losses))) / 2;
  return rows.map(row => ({...row, stat: {...row.stat, gamesBehind: behind(row) ? String(behind(row)) : '-'}}));
}

function Table({group, favorites, ranked, numbered, sort, onSort}) {
  /* A header: tap once for highest first, again for lowest first, a third time back to the standings order. */
  const head = (label, key, className) => <th key={label} className={className} aria-sort={sort?.key === key ? (sort.dir === 'up' ? 'ascending' : 'descending') : 'none'}>
    <button type="button" className={sort?.key === key ? 'on' : ''} onClick={() => onSort(key)}>{label}{sort?.key === key && (sort.dir === 'up' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</button>
  </th>;
  return <section className="front-panel stand">
    <div className="front-panel-head"><h2>{group.name}</h2></div>
    <div className="stand-scroll">
      <table>
        <thead><tr><th className="num">#</th>{head('Team', 'team', 'team')}{COLUMNS.map(([label, key]) => head(label, key, EXTRA.has(label) ? 'num extra' : 'num'))}</tr></thead>
        <tbody key={`${group.name}-${sort?.key}-${sort?.dir}`} className="list-in">{group.rows.map((row, index) => <React.Fragment key={row.code}>
          {ranked && index === 6 && <tr className="stand-cut"><td colSpan={COLUMNS.length + 2}>Play-in</td></tr>}
          {ranked && index === 10 && <tr className="stand-cut"><td colSpan={COLUMNS.length + 2}>Out of the picture</td></tr>}
          <tr className={favorites.includes(row.code) ? 'mine' : ''}>
            <td className="num rank">{numbered ? index + 1 : '–'}</td>
            <td className="team"><a href={`/lineups/${TEAMS[row.code].name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}><img src={espnLogoUrl(row.code)} alt=""/><b className="full">{TEAMS[row.code].name}</b><b className="nick">{TEAMS[row.code].name.split(' ').slice(-1)[0]}</b></a></td>
            {COLUMNS.map(([label, key]) => <td key={label} className={`num${EXTRA.has(label) ? ' extra' : ''}${label === 'Strk' && String(row.stat[key]).startsWith('W') ? ' up' : label === 'Strk' && String(row.stat[key]).startsWith('L') ? ' down' : ''}`}>{row.stat[key] ?? '–'}</td>)}
          </tr>
        </React.Fragment>)}</tbody>
      </table>
    </div>
  </section>;
}

export default function StandingsPage() {
  const favorites = useFavorites();
  const [groups, setGroups] = useState(null), [view, setView] = useState('eastern'), [error, setError] = useState(false), [sort, setSort] = useState(null);
  const onSort = key => setSort(now => (now?.key !== key ? {key, dir: key === 'team' ? 'up' : 'down'} : now.dir === (key === 'team' ? 'up' : 'down') ? {key, dir: key === 'team' ? 'down' : 'up'} : null));
  useEffect(() => {
    loadStandings().then(setGroups).catch(() => setError(true));
  }, []);
  const played = groups?.some(group => group.rows.some(row => Number(row.stat.wins) + Number(row.stat.losses) > 0));
  const ranked = Boolean(played);
  /* League: all 30 teams in one table, by record, with no playoff cut lines (those are per conference). */
  const picked = view === 'league' ? groups && [{name: 'League', rows: leagueRows(groups)}] : groups?.filter(group => group.name.toLowerCase().startsWith(view));
  const shown = sort ? picked?.map(group => ({...group, rows: sortRows(group.rows, sort)})) : picked;
  return <section className="sched">
    <div className="sched-head">
      <h1>Standings</h1>
    </div>
    <div className="sched-filters">
      <div className="front-tabs" role="group" aria-label="Conference">
        {[['eastern', 'East'], ['western', 'West'], ['league', 'League']].map(([key, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>)}
      </div>
    </div>
    {error && <p className="feed-empty">Standings are unavailable right now.</p>}
    {!groups && !error && <div className="front-panel" aria-busy="true" aria-label="Loading the standings"><div className="sk sk-title"/><div className="sk-rows">{Array.from({length: 15}, (_, index) => <div key={index} className="sk sk-row" style={{height: 36}}/>)}</div></div>}
    <div className="stand-grid">{shown?.map(group => <Table key={group.name} group={group} favorites={favorites} ranked={ranked && view !== 'league' && !sort} numbered={played} sort={sort} onSort={onSort}/>)}</div>
  </section>;
}
