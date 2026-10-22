import React, { useEffect, useState } from 'react';
import { espnLogoUrl, TEAMS } from '../lib/teams';
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

function Table({group, favorites, ranked, numbered}) {
  return <section className="front-panel stand">
    <div className="front-panel-head"><h2>{group.name}</h2></div>
    <div className="stand-scroll">
      <table>
        <thead><tr><th className="num">#</th><th className="team">Team</th>{COLUMNS.map(([label]) => <th key={label} className={EXTRA.has(label) ? 'num extra' : 'num'}>{label}</th>)}</tr></thead>
        <tbody>{group.rows.map((row, index) => <React.Fragment key={row.code}>
          {ranked && index === 6 && <tr className="stand-cut"><td colSpan={COLUMNS.length + 2}>Play-in</td></tr>}
          {ranked && index === 10 && <tr className="stand-cut"><td colSpan={COLUMNS.length + 2}>Out of the picture</td></tr>}
          <tr className={favorites.includes(row.code) ? 'mine' : ''}>
            <td className="num rank">{numbered ? index + 1 : '–'}</td>
            <td className="team"><a href={`/teams/${TEAMS[row.code].name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}><img src={espnLogoUrl(row.code)} alt=""/><b className="full">{TEAMS[row.code].name}</b><b className="nick">{TEAMS[row.code].name.split(' ').slice(-1)[0]}</b></a></td>
            {COLUMNS.map(([label, key]) => <td key={label} className={`num${EXTRA.has(label) ? ' extra' : ''}${label === 'Strk' && String(row.stat[key]).startsWith('W') ? ' up' : label === 'Strk' && String(row.stat[key]).startsWith('L') ? ' down' : ''}`}>{row.stat[key] ?? '–'}</td>)}
          </tr>
        </React.Fragment>)}</tbody>
      </table>
    </div>
  </section>;
}

export default function StandingsPage() {
  const favorites = useFavorites();
  const [groups, setGroups] = useState(null), [view, setView] = useState('eastern'), [error, setError] = useState(false);
  useEffect(() => {
    loadStandings().then(setGroups).catch(() => setError(true));
  }, []);
  const played = groups?.some(group => group.rows.some(row => Number(row.stat.wins) + Number(row.stat.losses) > 0));
  const ranked = Boolean(played);
  const shown = groups?.filter(group => group.name.toLowerCase().startsWith(view));
  return <section className="sched">
    <div className="sched-head">
      <h1>Standings</h1>
    </div>
    <div className="sched-filters">
      <div className="front-tabs" role="group" aria-label="Conference">
        {[['eastern', 'East'], ['western', 'West']].map(([key, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>)}
      </div>
    </div>
    {error && <p className="feed-empty">Standings are unavailable right now.</p>}
    {!groups && !error && <div className="front-panel"><p className="feed-empty">Loading…</p></div>}
    <div className="stand-grid">{shown?.map(group => <Table key={group.name} group={group} favorites={favorites} ranked={ranked} numbered={played}/>)}</div>
  </section>;
}
