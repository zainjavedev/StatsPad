import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, ChevronRight } from 'lucide-react';
import { GameList } from './Feeds';
import { useFeed } from '../lib/useFeed';
import { teamSchedule } from '../lib/espn';
import SEASON from '../season.json';

/* Team roster page for any of the 30 teams: who is on the team this season,
   how the rotation is expected to stack up, and each player's numbers from
   the stats season in src/season.json. Rosters live in
   public/data/<season>/rosters/<TEAM>.json (scripts/build-rosters.mjs). */

const STATS_LABEL = SEASON.stats.replace('-', '–');
const STATS_ARE_CURRENT = SEASON.stats === SEASON.rosters;
const TO_ESPN = {BRK: 'bkn', CHO: 'cha', GSW: 'gs', NOP: 'no', NYK: 'ny', PHO: 'phx', SAS: 'sa', UTA: 'utah', WAS: 'wsh'};

/* The darker of the team's two colours carries the white text in the header
   and photo stages; the other becomes the accent stripe. A colour that is
   still too light for white text gets darkened. */
const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function teamPalette(colors = {}) {
  const primary = colors.primary || '#333333', secondary = colors.secondary || '#ffffff';
  const [dark, accent] = luminance(primary) <= luminance(secondary) ? [primary, secondary] : [secondary, primary];
  return {'--team': luminance(dark) > 0.18 ? `color-mix(in srgb, ${dark} 55%, black)` : dark, '--team-accent': accent};
}

const STAT_COLUMNS = [
  {key: 'gamesPlayed', label: 'GP', places: 0},
  {key: 'minutesPerGame', label: 'MIN'},
  {key: 'points', label: 'PTS'},
  {key: 'totalRebounds', label: 'REB'},
  {key: 'assists', label: 'AST'},
  {key: 'steals', label: 'STL'},
  {key: 'blocks', label: 'BLK'},
  {key: 'fieldGoalPercentage', label: 'FG%', pct: true},
  {key: 'threePointPercentage', label: '3P%', pct: true},
  {key: 'freeThrowPercentage', label: 'FT%', pct: true},
];
const SORT_CHIPS = ['points', 'totalRebounds', 'assists', 'threePointPercentage', 'fieldGoalPercentage', 'steals', 'blocks'];

/* A percentage only counts toward sorting and the team-best highlight once
   the player has a real sample behind it. */
const qualifies = (player, key) => {
  if (!player.stats || player.gamesPlayed < 15 || player.minutesPerGame < 10) return false;
  if (key === 'threePointPercentage') return player.stats.threePointersAttempted >= 1.5;
  if (key === 'freeThrowPercentage') return player.stats.freeThrowsAttempted >= 1;
  return true;
};
const statOf = (player, key) => key === 'gamesPlayed' || key === 'minutesPerGame' ? player[key] : player.stats?.[key];
const show = (value, column) => value == null ? '—' : `${Number(value).toFixed(column.places ?? 1)}${column.pct ? '%' : ''}`;
const initials = name => name.replace(/ (Jr\.|Sr\.|II|III)$/, '').split(' ').map(part => part[0]).slice(0, 2).join('');

/* NBA.com headshot when we know the NBA id, ESPN's otherwise, initials last. */
function Headshot({player, className}) {
  const sources = useMemo(() => [
    player.nbaId && `https://cdn.nba.com/headshots/nba/latest/260x190/${player.nbaId}.png`,
    player.espnId && `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${player.espnId}.png&w=260&h=190`,
  ].filter(Boolean), [player.nbaId, player.espnId]);
  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [sources]);
  if (!sources[step]) return <span className={`${className} roster-monogram`} aria-hidden="true">{initials(player.name)}</span>;
  return <img className={className} src={sources[step]} alt="" loading="lazy" onError={() => setStep(current => current + 1)}/>;
}

const noStatsText = player => player.exp === 0 ? 'Rookie' : STATS_ARE_CURRENT ? 'No games yet' : 'Did not play last season';
const statLine = player => player.stats
  ? `${player.stats.points.toFixed(1)} pts · ${player.stats.totalRebounds.toFixed(1)} reb · ${player.stats.assists.toFixed(1)} ast`
  : noStatsText(player);

function StarterCard({player, onOpen}) {
  return <button className="starter-card" onClick={() => onOpen(player)} disabled={!player.profile}>
    <span className="starter-stage">
      <span className="slot-badge">{player.slot}</span>
      <Headshot player={player} className="starter-art"/>
    </span>
    <h3>{player.name}</h3>
    {player.stats ? <dl className="starter-line">
      <div><dt>PTS</dt><dd>{player.stats.points.toFixed(1)}</dd></div>
      <div><dt>REB</dt><dd>{player.stats.totalRebounds.toFixed(1)}</dd></div>
      <div><dt>AST</dt><dd>{player.stats.assists.toFixed(1)}</dd></div>
    </dl> : <p className="starter-none">{noStatsText(player)}</p>}
  </button>;
}

function UnitRow({player, onOpen}) {
  const body = <>
    <Headshot player={player} className="unit-art"/>
    <span className="unit-who"><strong>{player.name}</strong><span>{player.pos} · {statLine(player)}</span></span>
  </>;
  return <li>{player.profile
    ? <button className="unit-row" onClick={() => onOpen(player)}>{body}<ChevronRight className="unit-go" size={16}/></button>
    : <div className="unit-row">{body}</div>}</li>;
}

function StatTable({players, onOpen}) {
  const [sort, setSort] = useState({key: 'points', desc: true});
  const rows = useMemo(() => {
    const rank = player => !player.stats ? 2 : qualifies(player, sort.key) ? 0 : 1;
    return [...players.filter(player => player.stats)].sort((a, b) => rank(a) - rank(b) || ((statOf(b, sort.key) ?? 0) - (statOf(a, sort.key) ?? 0)) * (sort.desc ? 1 : -1));
  }, [players, sort]);
  const best = useMemo(() => {
    const values = players.filter(player => qualifies(player, sort.key)).map(player => statOf(player, sort.key));
    return values.length ? Math.max(...values) : null;
  }, [players, sort.key]);
  const noStats = players.filter(player => !player.stats);
  const pick = key => setSort(current => ({key, desc: current.key === key ? !current.desc : true}));

  /* On narrow screens, bring the sorted column into view beside the names. */
  const scrollRef = useRef(null);
  useEffect(() => {
    const box = scrollRef.current, cell = box?.querySelector('thead th.sorted'), pinned = box?.querySelector('thead .sticky-col');
    if (!box || !cell || box.scrollWidth <= box.clientWidth) return;
    const left = cell.offsetLeft - pinned.offsetWidth, right = cell.offsetLeft + cell.offsetWidth - box.clientWidth;
    if (box.scrollLeft > left) box.scrollTo({left, behavior: 'smooth'});
    else if (box.scrollLeft < right) box.scrollTo({left: right + 24, behavior: 'smooth'});
  }, [sort.key]);
  const arrow = key => sort.key === key && (sort.desc ? <ArrowDown size={11}/> : <ArrowUp size={11}/>);

  return <section className="stat-board">
    <div className="board-head">
      <h2>{STATS_ARE_CURRENT ? 'This season' : 'Last season'}&apos;s stats</h2>
      <div className="sort-chips" role="group" aria-label="Sort by">
        {SORT_CHIPS.map(key => <button key={key} className={sort.key === key ? 'active' : ''} onClick={() => pick(key)}>
          {STAT_COLUMNS.find(column => column.key === key).label}{arrow(key)}
        </button>)}
      </div>
    </div>
    <div className="board-scroll" ref={scrollRef}>
      <table className="board-table">
        <thead><tr>
          <th className="sticky-col">Player</th>
          {STAT_COLUMNS.map(column => <th key={column.key} className={sort.key === column.key ? 'sorted' : ''} aria-sort={sort.key === column.key ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
            <button onClick={() => pick(column.key)}>{column.label}{arrow(column.key)}</button>
          </th>)}
        </tr></thead>
        <tbody>{rows.map(player => <tr key={player.name}>
          <th className="sticky-col" scope="row"><button className="board-name" onClick={() => onOpen(player)}>{player.name}</button></th>
          {STAT_COLUMNS.map(column => {
            const value = statOf(player, column.key);
            const lead = column.key === sort.key && value === best && qualifies(player, column.key);
            const thin = column.pct && !qualifies(player, column.key);
            return <td key={column.key} className={[sort.key === column.key && 'sorted', lead && 'lead', thin && 'thin'].filter(Boolean).join(' ')}>{show(value, column)}</td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="board-note">
      {STATS_LABEL} regular season, per game. Faded percentages come from too few attempts and sort last.
      {noStats.length > 0 && <> No NBA stats yet: {noStats.map(player => player.name).join(', ')}.</>}
    </p>
  </section>;
}

export default function TeamPage({teamCode = 'PHI', leaguePlayers, teamEntity, onOpen}) {
  const [roster, setRoster] = useState(null), [error, setError] = useState(false);
  const loadGames = useMemo(() => () => teamSchedule(TO_ESPN[teamCode] || teamCode.toLowerCase(), 5), [teamCode]);
  const games = useFeed(loadGames);
  useEffect(() => {
    let active = true;
    setRoster(null); setError(false);
    fetch(`/data/${SEASON.rosters}/rosters/${teamCode}.json`).then(response => response.json()).then(data => active && setRoster(data)).catch(() => active && setError(true));
    return () => { active = false; };
  }, [teamCode]);
  useEffect(() => { if (roster) document.title = `${roster.teamName} roster · StatsPad`; }, [roster]);

  const players = useMemo(() => {
    if (!roster) return [];
    const byId = new Map(leaguePlayers.map(player => [player.playerId, player]));
    return roster.players.map(entry => {
      const last = entry.bbrefId && byId.get(entry.bbrefId);
      return {...entry, profile: last || null, stats: last?.stats ?? null, gamesPlayed: last?.gamesPlayed, minutesPerGame: last?.minutesPerGame};
    });
  }, [roster, leaguePlayers]);

  if (error) return <section className="team-page"><p className="vs-empty">No roster found for “{teamCode}”.</p></section>;
  if (!roster) return <section className="team-page"><p className="vs-empty">Loading the roster…</p></section>;
  const unit = key => players.filter(player => player.unit === key);
  const open = player => player.profile && onOpen(player.profile, roster.teamName);

  return <section className="team-page" style={teamPalette(roster.colors)}>
    <div className="team-hero">
      <span className="team-hero-mark"><img className="team-hero-logo" src={`https://cdn.nba.com/logos/nba/${roster.teamId}/global/L/logo.svg`} alt="" onError={event => { event.currentTarget.style.display = 'none'; }}/></span>
      <div>
        <h1>{roster.teamName}</h1>
        <p>{roster.season.replace('-', '–')} roster{roster.coach ? ` · Coach ${roster.coach}` : ''}</p>
      </div>
      {teamEntity && <button className="team-hero-stats" onClick={() => onOpen(teamEntity, roster.teamName)}><BarChart3 size={15}/> Team stats</button>}
    </div>

    <section className="team-block">
      <h2>Starting five</h2>
      <div className="starter-grid">{unit('starters').map(player => <StarterCard key={player.name} player={player} onOpen={open}/>)}</div>
    </section>

    <section className="team-block team-games">
      <h2>Next games</h2>
      <GameList games={games}/>
    </section>

    <section className="team-block units">
      {roster.units.filter(entry => entry.key !== 'starters').map(entry => <div className="unit-card" key={entry.key}>
        <h2>{entry.label}</h2>
        <ul>{unit(entry.key).map(player => <UnitRow key={player.name} player={player} onOpen={open}/>)}</ul>
      </div>)}
    </section>

    <StatTable players={players} onOpen={open}/>

    <p className="team-sources">Roster as of {roster.lastUpdated}. Lineups and units are projections. Sources: {roster.sources.map((source, index) => <React.Fragment key={source.url}>{index ? ', ' : ''}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></React.Fragment>)}.</p>
  </section>;
}
