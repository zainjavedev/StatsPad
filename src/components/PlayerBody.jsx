import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Share2 } from 'lucide-react';
import PlayerShare from './PlayerShare';
import { TEAMS, teamCodeOf, espnLogoUrl } from '../lib/teams';
import { slugify } from '../lib/routes';
import { careerOf, liveRow, seasonsOf, tsOf } from '../lib/career';
import { pretty } from '../lib/season';
import { performancesOf } from '../lib/performances';
import { finished, loadSchedule } from '../lib/schedule';
import { loadBoxscore } from '../lib/boxscore';
import { navigate } from '../lib/nav';
import {PerfCard, PerfSkeleton} from './RecentPerformances';
import Radar from './Radar';
import { radarAxes, teamHex as radarHex } from '../lib/radarAxes';

/* Everything under a player's hero: season tiles with league ranks, the
   career trend, the season-by-season table and who to compare with next. */

const TILES = [
  ['PPG', p => p.stats.points], ['RPG', p => p.stats.totalRebounds], ['APG', p => p.stats.assists],
  ['SPG', p => p.stats.steals], ['BPG', p => p.stats.blocks], ['MPG', p => p.minutesPerGame],
  ['FG%', p => p.stats.fieldGoalPercentage, p => p.stats.fieldGoalsAttempted >= 1],
  ['3P%', p => p.stats.threePointPercentage, p => p.stats.threePointersAttempted >= 1],
  ['FT%', p => p.stats.freeThrowPercentage, p => p.stats.freeThrowsAttempted >= 1],
  ['TS%', p => p.trueShooting],
];
const TREND = [
  ['PPG', row => row.pts], ['RPG', row => row.reb], ['APG', row => row.ast], ['TS%', tsOf, row => row.fga >= 1],
  ['FG%', row => row.fgp], ['3P%', row => row.tpp, row => row.tpa >= 1], ['MPG', row => row.mpg],
];
const ord = n => { const suffix = ['th', 'st', 'nd', 'rd'], v = n % 100; return `${n}${suffix[(v - 20) % 10] || suffix[v] || suffix[0]}`; };
const f1 = value => Number(value).toFixed(1);
const plain = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.']/g, '').replace(/ (jr|sr|ii|iii|iv)$/, '').trim();

/* The player's last few games this season, newest first, found in the box scores of recent finals. */
function useRecentLines(name) {
  const [lines, setLines] = useState(null);
  useEffect(() => {
    let live = true;
    setLines(null);
    loadSchedule().then(all => finished(all.filter(game => !game.preseason), 60))
      .then(finals => Promise.all(finals.map(game => loadBoxscore(game.id).then(box => performancesOf(box, game.id)).catch(() => []))))
      .then(groups => {
        if (!live) return;
        const mine = groups.flat().filter(line => plain(line.player.name) === plain(name));
        setLines(mine.sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 8));
      })
      .catch(() => { if (live) setLines([]); });
    return () => { live = false; };
  }, [name]);
  return lines;
}

function RecentGames({ lines }) {
  if (lines && !lines.length) return null;
  return <section className="pp-recent" aria-label="Recent performances">
    <h2>Recent performances</h2>
    {lines === null ? <PerfSkeleton count={3}/>
      : <ul className="rp-list">{lines.slice(0, 5).map(line => <li key={line.gameId}><PerfCard line={line} onPick={() => navigate(`/games/${line.gameId}?player=${line.player.id}`)}/></li>)}</ul>}
  </section>;
}

const espnPhoto = player => { const id = (/^espn-(\d+)$/.exec(player.playerId ?? '') || [])[1]; return id ? `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png` : null; };
const teamHex = player => TEAMS[teamCodeOf(player.team)]?.color || '#8a8a8a';

const SEASON_LINE = ['PPG', 'RPG', 'APG', 'SPG', 'BPG', 'MPG', 'FG%', '3P%', 'FT%', 'TS%'];
const split = name => { const parts = name.split(' '); return parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : ['', name]; };

const teamText = row => (row.tot ? 'TOT' : row.t);

function rankOf(population, entity, [, get, gate]) {
  if (gate && !gate(entity)) return null;
  const values = population.filter(player => !gate || gate(player)).map(get).sort((a, b) => b - a);
  return { rank: values.findIndex(value => value <= get(entity)) + 1, total: values.length };
}

function useCareer(name) {
  const [state, setState] = useState(undefined);
  useEffect(() => {
    let active = true;
    setState(undefined);
    /* A missing file comes back as the app shell (HTML), which fails to parse. */
    fetch(`/data/careers/${slugify(name)}.json`).then(response => response.json()).then(data => active && setState(Array.isArray(data?.rows) ? data : null)).catch(() => active && setState(null));
    return () => { active = false; };
  }, [name]);
  return state;
}

function TrendChart({ seasons, tint }) {
  const [metric, setMetric] = useState(0);
  const [label, get, gate] = TREND[metric];
  const points = seasons.filter(entry => entry.main.gp > 0 && (!gate || gate(entry.main))).map(entry => ({ s: entry.s, value: get(entry.main), live: entry.main.live }));
  const width = 640, height = 250, pad = { left: 34, right: 18, top: 24, bottom: 30 };
  const values = points.map(point => point.value);
  const low = Math.min(...values), high = Math.max(...values);
  const span = high - low || 1;
  const lo = Math.max(0, low - span * 0.25), hi = high + span * 0.2;
  const x = index => pad.left + (points.length === 1 ? (width - pad.left - pad.right) / 2 : (index / (points.length - 1)) * (width - pad.left - pad.right));
  const y = value => pad.top + (1 - (value - lo) / (hi - lo)) * (height - pad.top - pad.bottom);
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
  const showValues = points.length <= 12;
  const every = Math.ceil(points.length / 8);
  return <div className="pp-trend">
    <div className="pp-tabs" role="tablist" aria-label="Trend stat">
      {TREND.map(([name], index) => <button key={name} role="tab" aria-selected={index === metric} className={index === metric ? 'active' : ''} onClick={() => setMetric(index)}>{name}</button>)}
    </div>
    {points.length < 2
      ? <p className="pp-empty">{points.length ? 'One season so far, so there is no trend yet.' : 'Not enough shooting attempts to chart this stat.'}</p>
      : <svg key={metric} style={{ color: tint }} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} by season`}>
        <defs><linearGradient id="ppFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".28"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
        {[0, 0.5, 1].map(step => <line key={step} x1={pad.left} x2={width - pad.right} y1={pad.top + step * (height - pad.top - pad.bottom)} y2={pad.top + step * (height - pad.top - pad.bottom)} className="pp-grid"/>)}
        <path d={`${path} L${x(points.length - 1).toFixed(1)},${height - pad.bottom} L${x(0).toFixed(1)},${height - pad.bottom} Z`} className="pp-area"/>
        <path d={path} className="pp-line" pathLength="1"/>
        <circle r="6" className="pp-comet"><animateMotion dur="1.3s" fill="freeze" path={path} calcMode="linear"/></circle>
        {points.map((point, index) => <g key={point.s} style={{ '--t': `${(points.length > 1 ? index / (points.length - 1) : 0) * 1.25}s` }}>
          <circle cx={x(index)} cy={y(point.value)} r={point.live || index === points.length - 1 ? 5 : 3.5} className={point.live ? 'pp-dot live' : 'pp-dot'}><title>{`${pretty(point.s)}: ${f1(point.value)} ${label}`}</title></circle>
          {showValues && <text x={x(index)} y={y(point.value) - 10} textAnchor="middle" className="pp-val">{f1(point.value)}</text>}
          {index % every === 0 && <text x={x(index)} y={height - 8} textAnchor="middle" className="pp-axis">{point.s.slice(2)}</text>}
        </g>)}
      </svg>}
  </div>;
}

function CareerTable({ seasons, career, currentSeason }) {
  const cols = [['GP', r => r.gp, 0], ['GS', r => r.gs, 0], ['MPG', r => r.mpg], ['PPG', r => r.pts], ['RPG', r => r.reb], ['APG', r => r.ast], ['SPG', r => r.stl], ['BPG', r => r.blk], ['TOV', r => r.tov], ['FG%', r => r.fgp], ['3P%', r => r.tpp], ['FT%', r => r.ftp], ['TS%', tsOf]];
  const cell = (row, [, get, places]) => {
    const value = get(row);
    return places === 0 ? Math.round(value) : f1(value);
  };
  const line = (row, key, className) => <tr key={key} className={className}>
    <th scope="row">{row.s === 'Career' ? 'Career' : pretty(row.s)}</th><td>{row.s === 'Career' ? '' : teamText(row)}</td>
    {cols.map(col => <td key={col[0]}>{cell(row, col)}</td>)}
  </tr>;
  return <div className="pp-table-wrap"><table className="pp-table">
    <thead><tr><th>Season</th><th>Team</th>{cols.map(([name]) => <th key={name}>{name}</th>)}</tr></thead>
    <tbody>
      {[...seasons].reverse().flatMap(entry => [
        line(entry.main, entry.s, entry.s === currentSeason ? 'current' : ''),
        ...entry.stints.map(stint => line(stint, `${entry.s}-${stint.t}`, 'stint')),
      ])}
      {career && line(career, 'career', 'career')}
    </tbody>
  </table></div>;
}

export default function PlayerBody({ entity, season, population, showCareer, onOpen, onCompare }) {
  const enriched = useMemo(() => ({ ...entity, trueShooting: tsOf({ pts: entity.stats.points, fga: entity.stats.fieldGoalsAttempted, fta: entity.stats.freeThrowsAttempted }) }), [entity]);
  const pool = useMemo(() => population.map(player => ({ ...player, trueShooting: tsOf({ pts: player.stats.points, fga: player.stats.fieldGoalsAttempted, fta: player.stats.freeThrowsAttempted }) })), [population]);
  const teamCode = teamCodeOf(entity.team), [first, last] = split(entity.playerName);
  const history = useCareer(entity.playerName), recent = useRecentLines(entity.playerName);
  const seasons = useMemo(() => seasonsOf(history?.rows || [], season ? liveRow(entity, season) : null), [history, entity, season]);
  const career = useMemo(() => careerOf(seasons), [seasons]);
  /* Head-to-head suggestions: players at the same kind of position, on other teams, who put up similar numbers. */
  const suggestions = useMemo(() => {
    const kind = position => (/C/.test(position) ? 'big' : /F/.test(position) ? 'wing' : 'guard');
    const gap = other => Math.abs(other.stats.points - entity.stats.points) + .8 * Math.abs(other.stats.totalRebounds - entity.stats.totalRebounds) + .8 * Math.abs(other.stats.assists - entity.stats.assists);
    const others = pool.filter(player => player.playerId !== entity.playerId && player.team !== entity.team);
    const alike = others.filter(player => kind(player.position) === kind(entity.position));
    return [...(alike.length >= 5 ? alike : others)].sort((a, b) => gap(a) - gap(b)).slice(0, 5);
  }, [pool, entity]);

  const [sharing, setSharing] = useState(false);

  return <div className="pp-layout">
    <div className="pf-top" style={{ '--team': teamHex(entity) }}>
    <div className="pf-hero">
      {teamCode && <img className="pf-logo" src={espnLogoUrl(teamCode)} alt=""/>}
      <div className="pf-copy">
        {first && <span className="pf-first">{first}</span>}
        <h1 className="pf-last" style={{'--n': Math.max(last.length, 5)}}>{last}</h1>
        <p className="pf-meta">{teamCode ? entity.team : ''} · {entity.position} · Age {entity.age} · {entity.gamesPlayed} {entity.gamesPlayed === 1 ? 'game' : 'games'} · {entity.gamesStarted} {entity.gamesStarted === 1 ? 'start' : 'starts'}</p>
        <div className="pf-actions">
          <button type="button" className="pf-compare" onClick={() => onCompare(entity)}><BarChart3 size={16}/> Compare</button>
          <button type="button" className="ghost-button" onClick={() => setSharing(true)} title="Share this as an image"><Share2 size={15}/> Share</button>
        </div>
      </div>
      {pool.length > 10 && <div className="pf-radar" aria-label={`${entity.playerName} skill radar`}>
        <Radar axes={radarAxes(enriched, enriched, pool).map(axis => ({ ...axis, sides: [axis.sides[0]] }))} names={[entity.playerName]} colors={['#ffffff']}/>
      </div>}
      {espnPhoto(entity) && <img className="pf-photo" src={espnPhoto(entity)} alt=""/>}
    </div>
    <section className="pf-stats-wrap" aria-label={`${season ? pretty(season) : 'Season'} per-game stats`}>
      {SEASON_LINE.map(name => {
          const tile = TILES.find(item => item[0] === name), ranking = rankOf(pool, enriched, tile);
          return <div key={name} className="pf-stat">
            <strong>{f1(tile[1](enriched))}</strong>
            <span>{name}</span>
            <small className={ranking && ranking.rank <= 10 ? 'top' : ''}>{ranking ? <>{ord(ranking.rank)}<i> of {ranking.total}</i></> : 'Too few attempts'}</small>
          </div>;
        })}
    </section>
    {sharing && <PlayerShare player={enriched} pool={pool} season={season ? pretty(season) : ''} onClose={() => setSharing(false)}/>}
    </div>
    <RecentGames lines={recent}/>

    <div className="pp-grid-2">
      {showCareer && <section className="pp-card">
        <div className="pp-head"><h2>How {entity.playerName.split(' ')[0]}&apos;s numbers have moved</h2></div>
        {history === undefined
          ? <div className="sk" style={{ height: 230, borderRadius: 12 }}/>
          : <TrendChart seasons={seasons} tint={radarHex(entity)}/>}
      </section>}
      {pool.length > 10 && <aside className="pp-card pp-radar pp-radar-card">
        <div className="pp-head"><h2>{entity.playerName.split(' ')[0]}&apos;s skill radar</h2></div>
        <Radar axes={radarAxes(enriched, enriched, pool).map(axis => ({ ...axis, sides: [axis.sides[0]] }))} names={[entity.playerName]} colors={[radarHex(entity)]}/>
        <p className="pp-note">Each spoke runs from the league&apos;s lowest to highest rotation player.</p>
      </aside>}
    </div>

    {showCareer && <section className="pp-card">
      <div className="pp-head"><h2>Career stats per game</h2></div>
      {history === undefined
        ? <div className="sk" style={{ height: 180, borderRadius: 12 }}/>
        : <CareerTable seasons={seasons} career={seasons.length > 1 ? career : null} currentSeason={season}/>}
      <p className="pp-note">Regular season, per game{history?.rows?.length ? '' : '. No earlier NBA seasons on record'}. TOT is a full season split across teams. Career is weighted by games played.</p>
    </section>}

    {suggestions.length > 0 && <section className="pp-card">
      <div className="pp-head"><h2>Put {entity.playerName.split(' ')[0]} head to head</h2></div>
      <div className="pp-vs-grid">
        {suggestions.map(player => <div key={player.playerId} className="pp-vs" style={{ '--a': teamHex(entity), '--b': teamHex(player) }}>
          <button className="pp-vs-faces" onClick={() => onCompare([entity, player])} aria-label={`Compare ${entity.playerName} with ${player.playerName}`}>
            <span className="pp-vs-face">{espnPhoto(entity) ? <img src={espnPhoto(entity)} alt="" loading="lazy"/> : <i/>}</span>
            <b>VS</b>
            <span className="pp-vs-face">{espnPhoto(player) ? <img src={espnPhoto(player)} alt="" loading="lazy"/> : <i/>}</span>
          </button>
          <div className="pp-vs-meta">
            <button className="pp-open" onClick={() => onOpen(player)}><b>{player.playerName}</b><small>{player.team} · {f1(player.stats.points)} PPG</small></button>
            <button className="pp-versus" onClick={() => onCompare([entity, player])}><BarChart3 size={14}/> Compare</button>
          </div>
        </div>)}
      </div>
    </section>}
  </div>;
}
