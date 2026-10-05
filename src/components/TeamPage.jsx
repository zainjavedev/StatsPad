import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Sparkles, UserMinus } from 'lucide-react';

/* Team roster page. The roster file names who is on the team this season and
   how the rotation is expected to stack up; every number on the page is the
   player's previous-season regular-season line, wherever he played it. */

const TEAM_META = {
  PHI: {primary: '#006bb6', secondary: '#ed174c', abbr: 'PHI'},
};

const STAT_COLUMNS = [
  {key: 'gamesPlayed', label: 'GP', title: 'Games played', places: 0},
  {key: 'minutesPerGame', label: 'MIN', title: 'Minutes per game'},
  {key: 'points', label: 'PTS', title: 'Points per game'},
  {key: 'totalRebounds', label: 'REB', title: 'Rebounds per game'},
  {key: 'assists', label: 'AST', title: 'Assists per game'},
  {key: 'steals', label: 'STL', title: 'Steals per game'},
  {key: 'blocks', label: 'BLK', title: 'Blocks per game'},
  {key: 'turnovers', label: 'TOV', title: 'Turnovers per game (fewer is better)', inverse: true},
  {key: 'fieldGoalPercentage', label: 'FG%', title: 'Field goal %', pct: true},
  {key: 'threePointPercentage', label: '3P%', title: 'Three-point % (needs 1.5+ attempts a game to rank)', pct: true},
  {key: 'threePointersMade', label: '3PM', title: 'Threes made per game'},
  {key: 'freeThrowPercentage', label: 'FT%', title: 'Free throw % (needs 1+ attempt a game to rank)', pct: true},
  {key: 'trueShootingPercentage', label: 'TS%', title: 'True shooting %', pct: true},
];
const SORT_CHIPS = ['points', 'totalRebounds', 'assists', 'threePointPercentage', 'trueShootingPercentage', 'steals', 'blocks', 'minutesPerGame'];

/* What a player has to clear before his percentage counts in a sort or a
   "team best" highlight; seven games of 60% shooting shouldn't lead anything. */
const qualifies = (player, key) => {
  if (!player.stats || player.gamesPlayed < 15 || player.minutesPerGame < 10) return false;
  if (key === 'threePointPercentage') return player.stats.threePointersAttempted >= 1.5;
  if (key === 'freeThrowPercentage') return player.stats.freeThrowsAttempted >= 1;
  return true;
};

const trueShooting = stats => stats.fieldGoalsAttempted
  ? Number((stats.points / (2 * (stats.fieldGoalsAttempted + 0.44 * stats.freeThrowsAttempted)) * 100).toFixed(1))
  : 0;
const statOf = (player, key) => key === 'gamesPlayed' || key === 'minutesPerGame' ? player[key] : player.stats?.[key];
const show = (value, column) => value == null ? '—' : `${Number(value).toFixed(column.places ?? 1)}${column.pct ? '%' : ''}`;
const ageOn = (birthDate, day = new Date()) => {
  const birth = new Date(birthDate);
  let age = day.getFullYear() - birth.getFullYear();
  if (day < new Date(day.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age;
};
const initials = name => name.replace(/ (Jr\.|Sr\.|II|III)$/, '').split(' ').map(part => part[0]).slice(0, 2).join('');

/* League percentile in the categories that say what a player is good at. The
   best one becomes his tag, so the roster reads as a set of skills. */
const SKILLS = [
  {key: 'points', label: 'scorer'},
  {key: 'assists', label: 'playmaker'},
  {key: 'totalRebounds', label: 'rebounder'},
  {key: 'threePointPercentage', label: 'shooter'},
  {key: 'stocks', label: 'defender'},
  {key: 'trueShootingPercentage', label: 'finisher'},
];
const skillValue = (player, key) => key === 'stocks' ? player.stats.steals + player.stats.blocks : player.stats[key];
function leaguePercentiles(population) {
  const sorted = Object.fromEntries(SKILLS.map(({key}) => [key,
    population.filter(player => qualifies(player, key)).map(player => skillValue(player, key)).sort((a, b) => a - b)]));
  return player => SKILLS.filter(({key}) => qualifies(player, key)).map(({key, label}) => {
    const values = sorted[key], value = skillValue(player, key);
    const below = values.filter(other => other < value).length, equal = values.filter(other => other === value).length;
    return {key, label, pct: Math.round(((below + equal * 0.5) / values.length) * 100)};
  }).sort((a, b) => b.pct - a.pct);
}

function Headshot({player, color, className = ''}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [player.nbaId]);
  if (!player.nbaId || failed) return <span className={`${className} roster-monogram`} style={{'--team': color}} aria-hidden="true">{initials(player.name)}</span>;
  return <img className={className} src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.nbaId}.png`} alt="" loading="lazy" onError={() => setFailed(true)}/>;
}

function Origin({player}) {
  if (!player.stats) return <span className="roster-tag rookie">{player.exp === 0 ? 'Rookie' : 'No NBA minutes last season'}</span>;
  if (player.isNew) return <span className="roster-tag new">New · {/^\dTM$/.test(player.lastTeam) ? `${player.lastTeam[0]} teams last season` : `from ${player.lastTeam}`}</span>;
  return null;
}

function SkillTag({skill}) {
  if (!skill) return null;
  return <span className={skill.pct >= 90 ? 'skill-tag elite' : 'skill-tag'}>Top {Math.max(1, 100 - skill.pct)}% {skill.label}</span>;
}

function StarterCard({player, color, index}) {
  return <article className="starter-card" style={{'--row': index, '--team': color}}>
    <div className="starter-top"><span className="slot-badge">{player.slot}</span><Origin player={player}/></div>
    <Headshot player={player} color={color} className="starter-art"/>
    <h3>{player.name}</h3>
    <p className="starter-meta">{player.pos} · {player.height} · {player.age} yrs</p>
    {player.stats ? <dl className="starter-line">
      <div><dt>PTS</dt><dd>{player.stats.points.toFixed(1)}</dd></div>
      <div><dt>REB</dt><dd>{player.stats.totalRebounds.toFixed(1)}</dd></div>
      <div><dt>AST</dt><dd>{player.stats.assists.toFixed(1)}</dd></div>
    </dl> : <p className="starter-meta">No 2025–26 NBA stats</p>}
    <SkillTag skill={player.skill}/>
  </article>;
}

function UnitRow({player, color}) {
  return <li className="unit-row">
    <Headshot player={player} color={color} className="unit-art"/>
    <div className="unit-who">
      <strong>{player.name}</strong>
      <span>{player.pos} · {player.height} · {player.age} yrs{player.role ? ` · ${player.role}` : ''}</span>
      <div className="unit-tags"><Origin player={player}/>{player.status && <span className="roster-tag status">{player.status}</span>}<SkillTag skill={player.skill}/></div>
    </div>
    {player.stats
      ? <span className="unit-line"><b>{player.stats.points.toFixed(1)}</b> pts<b>{player.stats.totalRebounds.toFixed(1)}</b> reb<b>{player.stats.assists.toFixed(1)}</b> ast</span>
      : <span className="unit-line muted">—</span>}
  </li>;
}

function StatBoard({players, units, sort, setSort, unitFilter, setUnitFilter}) {
  const rows = useMemo(() => {
    const visible = players.filter(player => unitFilter === 'all' || player.unit === unitFilter);
    const rank = player => !player.stats ? 2 : qualifies(player, sort.key) ? 0 : 1;
    return [...visible].sort((a, b) => rank(a) - rank(b) || ((statOf(b, sort.key) ?? 0) - (statOf(a, sort.key) ?? 0)) * (sort.desc ? 1 : -1));
  }, [players, sort, unitFilter]);
  /* Team best per column across the whole roster, qualified players only. */
  const best = useMemo(() => Object.fromEntries(STAT_COLUMNS.map(({key, inverse}) => {
    const values = players.filter(player => qualifies(player, key)).map(player => statOf(player, key));
    return [key, values.length ? (inverse ? Math.min(...values) : Math.max(...values)) : null];
  })), [players]);
  /* On narrow screens the sorted column can sit off to the right; bring it
     into view beside the pinned name column whenever the sort changes. */
  const scrollRef = useRef(null);
  useEffect(() => {
    const box = scrollRef.current, cell = box?.querySelector('thead th.sorted'), pinned = box?.querySelector('thead .sticky-col');
    if (!box || !cell || box.scrollWidth <= box.clientWidth) return;
    const left = cell.offsetLeft - pinned.offsetWidth, right = cell.offsetLeft + cell.offsetWidth - box.clientWidth;
    if (box.scrollLeft > left) box.scrollTo({left, behavior: 'smooth'});
    else if (box.scrollLeft < right) box.scrollTo({left: right + 24, behavior: 'smooth'});
  }, [sort.key]);
  const pick = key => setSort(current => current.key === key ? {key, desc: !current.desc} : {key, desc: !STAT_COLUMNS.find(entry => entry.key === key).inverse});
  const unitLabel = Object.fromEntries(units.map(unit => [unit.key, unit.short]));

  return <section className="stat-board" id="stats">
    <div className="board-head">
      <div><small>LAST SEASON, SIDE BY SIDE</small><h2>Sort the roster</h2></div>
      <div className="segmented unit-filter" role="group" aria-label="Filter by unit">
        <button className={unitFilter === 'all' ? 'active' : ''} onClick={() => setUnitFilter('all')}>All</button>
        {units.map(unit => <button key={unit.key} className={unitFilter === unit.key ? 'active' : ''} onClick={() => setUnitFilter(unit.key)}>{unit.short}</button>)}
      </div>
    </div>
    <div className="sort-chips" role="group" aria-label="Sort by">
      <span>Sort by</span>
      {SORT_CHIPS.map(key => {
        const entry = STAT_COLUMNS.find(item => item.key === key);
        return <button key={key} className={sort.key === key ? 'active' : ''} onClick={() => pick(key)}>
          {entry.label}{sort.key === key && (sort.desc ? <ArrowDown size={12}/> : <ArrowUp size={12}/>)}
        </button>;
      })}
    </div>
    <div className="board-scroll" ref={scrollRef}>
      <table className="board-table">
        <thead><tr>
          <th className="sticky-col">Player</th>
          {STAT_COLUMNS.map(entry => <th key={entry.key} className={sort.key === entry.key ? 'sorted' : ''} aria-sort={sort.key === entry.key ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
            <button onClick={() => pick(entry.key)} title={entry.title}>{entry.label}{sort.key === entry.key && (sort.desc ? <ArrowDown size={11}/> : <ArrowUp size={11}/>)}</button>
          </th>)}
        </tr></thead>
        <tbody>{rows.map(player => <tr key={player.name} className={player.stats ? '' : 'no-stats'}>
          <th className="sticky-col" scope="row"><span className="board-name">{player.name}</span><small>{unitLabel[player.unit]}{player.isNew ? ' · new' : ''}{player.stats && player.gamesPlayed < 15 ? ' · small sample' : ''}</small></th>
          {STAT_COLUMNS.map(entry => {
            const value = player.stats ? statOf(player, entry.key) : null;
            const lead = value != null && value === best[entry.key] && qualifies(player, entry.key);
            return <td key={entry.key} className={[sort.key === entry.key && 'sorted', lead && 'lead', value != null && entry.pct && !qualifies(player, entry.key) && 'thin'].filter(Boolean).join(' ')}>{show(value, entry)}</td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="board-note">Per-game 2025–26 regular-season numbers for each player, whichever team he played for. Green cells are the roster&apos;s best (15+ games, 10+ minutes; 1.5+ threes a game for 3P%). Faded percentages haven&apos;t hit that bar and sort below everyone who has.</p>
  </section>;
}

export default function TeamPage({teamCode = 'PHI', leaguePlayers}) {
  const [roster, setRoster] = useState(null), [error, setError] = useState(false);
  const [sort, setSort] = useState({key: 'points', desc: true}), [unitFilter, setUnitFilter] = useState('all');
  useEffect(() => {
    let active = true;
    fetch(`/data/2026-27/rosters/${teamCode}.json`).then(response => response.json()).then(data => active && setRoster(data)).catch(() => active && setError(true));
    return () => { active = false; };
  }, [teamCode]);

  const meta = TEAM_META[teamCode];
  const percentilesFor = useMemo(() => leaguePercentiles(leaguePlayers), [leaguePlayers]);
  const players = useMemo(() => {
    if (!roster) return [];
    const byId = new Map(leaguePlayers.map(player => [player.playerId, player]));
    return roster.players.map(entry => {
      const last = entry.bbrefId && byId.get(entry.bbrefId);
      const stats = last ? {...last.stats, trueShootingPercentage: trueShooting(last.stats)} : null;
      const player = {...entry, age: ageOn(entry.birthDate), stats, gamesPlayed: last?.gamesPlayed, minutesPerGame: last?.minutesPerGame, lastTeam: last?.team};
      player.isNew = Boolean(last && last.team !== teamCode);
      player.skill = stats ? percentilesFor(player).find(skill => skill.pct >= 70) : null;
      return player;
    });
  }, [roster, leaguePlayers, percentilesFor, teamCode]);

  if (error) return <section className="team-page"><p className="vs-empty">Couldn&apos;t load the roster. Try a refresh.</p></section>;
  if (!roster) return <section className="team-page"><p className="vs-empty">Loading the roster…</p></section>;

  const unit = key => players.filter(player => player.unit === key);
  const starters = unit('starters'), newcomers = players.filter(player => player.isNew || !player.stats);
  const startersPts = starters.reduce((sum, player) => sum + (player.stats?.points ?? 0), 0);
  const avgAge = players.reduce((sum, player) => sum + player.age, 0) / players.length;
  const returning = new Set(players.map(player => player.bbrefId));
  const departed = leaguePlayers.filter(player => player.team === teamCode && !returning.has(player.playerId)).sort((a, b) => b.minutesPerGame - a.minutesPerGame);
  const leaders = [['points', 'Points', 'PPG'], ['totalRebounds', 'Rebounds', 'RPG'], ['assists', 'Assists', 'APG'], ['threePointPercentage', 'Three-point %', '3P%']].map(([key, label, unitText]) => {
    const best = players.filter(player => qualifies(player, key)).sort((a, b) => b.stats[key] - a.stats[key])[0];
    return {key, label, unitText, player: best};
  });

  return <section className="team-page" style={{'--team': meta.primary, '--team-2': meta.secondary}}>
    <div className="team-hero">
      <div className="team-hero-copy">
        <small>{roster.season.replace('-', '–')} ROSTER · TRAINING CAMP</small>
        <h1>{roster.teamName}</h1>
        <p>Head coach {roster.coach} · {players.length} players in camp · {newcomers.length} new faces</p>
      </div>
      <img className="team-hero-logo" src={`https://cdn.nba.com/logos/nba/${roster.teamId}/global/L/logo.svg`} alt="" onError={event => { event.currentTarget.style.display = 'none'; }}/>
      <dl className="team-facts">
        <div><dt>Starting five, last season</dt><dd>{startersPts.toFixed(1)}<span> combined PPG</span></dd></div>
        <div><dt>Average age</dt><dd>{avgAge.toFixed(1)}<span> years</span></dd></div>
        <div><dt>Oldest / youngest</dt><dd>{Math.max(...players.map(p => p.age))}<span> / </span>{Math.min(...players.map(p => p.age))}</dd></div>
      </dl>
    </div>

    <section className="team-block">
      <div className="block-head"><div><small>PROJECTED</small><h2>Starting five</h2></div><a className="block-link" href="#stats">Compare every stat ↓</a></div>
      <div className="starter-grid">{starters.map((player, index) => <StarterCard key={player.name} player={player} color={meta.primary} index={index}/>)}</div>
    </section>

    <section className="team-block">
      <div className="block-head"><div><small>WHO SHINED LAST SEASON</small><h2>Roster leaders</h2></div></div>
      <div className="leader-tiles">{leaders.map(({key, label, unitText, player}) => player && <div className="leader-tile" key={key}>
        <span>{label}</span>
        <strong>{player.stats[key].toFixed(1)}{key === 'threePointPercentage' ? '%' : ''} <em>{unitText}</em></strong>
        <p>{player.name}{player.isNew ? <i> · new</i> : null}</p>
      </div>)}</div>
    </section>

    <section className="team-block units">
      {roster.units.filter(entry => entry.key !== 'starters').map(entry => <div className="unit-card" key={entry.key}>
        <div className="unit-head"><h2>{entry.label}</h2><span>{unit(entry.key).length}</span></div>
        <ul>{unit(entry.key).map(player => <UnitRow key={player.name} player={player} color={meta.primary}/>)}</ul>
      </div>)}
    </section>

    <StatBoard players={players} units={roster.units} sort={sort} setSort={setSort} unitFilter={unitFilter} setUnitFilter={setUnitFilter}/>

    {departed.length > 0 && <section className="team-block departed">
      <div className="block-head"><div><small>NOT ON THE {roster.season.replace('-', '–')} ROSTER</small><h2>Gone from last year&apos;s team</h2></div></div>
      <ul className="departed-list">{departed.map(player => <li key={player.playerId}><UserMinus size={14}/><b>{player.playerName}</b><span>{player.stats.points.toFixed(1)} pts · {player.minutesPerGame.toFixed(1)} min</span></li>)}</ul>
    </section>}

    <p className="team-sources"><Sparkles size={13}/> Roster as of {roster.lastUpdated}; rotation is a pre-season projection, not an official depth chart. Sources: {roster.sources.map((source, index) => <React.Fragment key={source.url}>{index ? ', ' : ''}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></React.Fragment>)}.</p>
  </section>;
}
