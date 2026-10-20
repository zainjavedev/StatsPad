import React, { useEffect, useState } from 'react';
import { espnLogoUrl, TEAMS } from '../lib/teams';
import { useFavorites } from '../lib/favorites';

/* Eastern and Western conference tables from ESPN's standings: seed, record, games behind,
   home and road records, last ten, streak and scoring. Seeds 1-6 go straight to the playoffs,
   7-10 to the play-in. */

const URL = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings';
const COLUMNS = [
  ['W', 'wins'], ['L', 'losses'], ['PCT', 'winPercent'], ['GB', 'gamesBehind'], ['Home', 'Home'], ['Road', 'Road'], ['L10', 'Last Ten Games'], ['Strk', 'streak'], ['PPG', 'avgPointsFor'], ['OPP', 'avgPointsAgainst'], ['DIFF', 'differential'],
];
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());

const parse = data => (data.children ?? []).map(group => ({
  name: group.name,
  rows: (group.standings?.entries ?? []).map(entry => {
    const stat = Object.fromEntries(entry.stats.map(item => [item.name, item.displayValue ?? item.value]));
    return {code: codeOf(entry.team.abbreviation), seed: Number(stat.playoffSeed) || 99, stat};
  }).filter(row => row.code).sort((a, b) => a.seed - b.seed),
}));

function Table({group, favorites}) {
  return <section className="front-panel stand">
    <div className="front-panel-head"><h2>{group.name}</h2></div>
    <div className="stand-scroll">
      <table>
        <thead><tr><th className="num">#</th><th className="team">Team</th>{COLUMNS.map(([label]) => <th key={label} className="num">{label}</th>)}</tr></thead>
        <tbody>{group.rows.map((row, index) => <React.Fragment key={row.code}>
          {index === 6 && <tr className="stand-cut"><td colSpan={COLUMNS.length + 2}>Play-in</td></tr>}
          {index === 10 && <tr className="stand-cut"><td colSpan={COLUMNS.length + 2}>Out of the picture</td></tr>}
          <tr className={favorites.includes(row.code) ? 'mine' : ''}>
            <td className="num rank">{index + 1}</td>
            <td className="team"><a href={`/teams/${TEAMS[row.code].name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}><img src={espnLogoUrl(row.code)} alt=""/><b>{TEAMS[row.code].name}</b></a></td>
            {COLUMNS.map(([label, key]) => <td key={label} className={`num${label === 'Strk' && String(row.stat[key]).startsWith('W') ? ' up' : label === 'Strk' ? ' down' : ''}`}>{row.stat[key] ?? '–'}</td>)}
          </tr>
        </React.Fragment>)}</tbody>
      </table>
    </div>
  </section>;
}

export default function StandingsPage() {
  const favorites = useFavorites();
  const [groups, setGroups] = useState(null), [view, setView] = useState('both'), [error, setError] = useState(false);
  useEffect(() => { fetch(URL).then(response => response.json()).then(data => setGroups(parse(data))).catch(() => setError(true)); }, []);
  const shown = groups?.filter(group => view === 'both' || group.name.toLowerCase().startsWith(view));
  return <section className="sched">
    <div className="sched-head">
      <h1>Standings</h1>
      <p>2026–27 regular season by conference. Teams you follow are highlighted.</p>
    </div>
    <div className="sched-filters">
      <div className="front-tabs" role="group" aria-label="Conference">
        {[['both', 'Both'], ['eastern', 'East'], ['western', 'West']].map(([key, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>)}
      </div>
    </div>
    {error && <p className="feed-empty">Standings are unavailable right now.</p>}
    {!groups && !error && <div className="front-panel"><p className="feed-empty">Loading…</p></div>}
    <div className={view === 'both' ? 'stand-grid' : ''}>{shown?.map(group => <Table key={group.name} group={group} favorites={favorites}/>)}</div>
  </section>;
}
