import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import ShareButton from './ShareButton';
import { TEAMS } from '../lib/teams';
import { onDark } from '../lib/share';
import { fgPct, fps, quarterStats, rating, tagsOf, total, tsPct } from '../lib/playerGame';

/* One player's night, for the game page: headline line, rating, tags, every stat by quarter, points and
   fantasy points quarter by quarter, who he assisted, and where his points came from. */

const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const dayFormat = new Intl.DateTimeFormat(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
const label = quarter => (quarter <= 4 ? `Q${quarter}` : quarter === 5 ? 'OT' : `${quarter - 4}OT`);
const tone = value => (value >= 8 ? 'great' : value >= 6 ? 'good' : value >= 4.5 ? 'ok' : 'poor');

export function gameCard({player, row, tags, grade, quarters, assists, game, color}) {
  const s = player.stats;
  return {
    kind: 'perf', eyebrow: 'Game report', title: player.name, person: {name: player.name, espnId: player.id}, color,
    sub: `${game.team} ${game.home ? 'vs' : '@'} ${game.opp} · ${game.won ? 'W' : 'L'} ${game.score}${game.date ? ` · ${dayFormat.format(game.date)}` : ''}`,
    rating: grade.toFixed(1), tone: tone(grade),
    headline: [[row.PTS, 'pts'], [row.AST >= row.REB ? row.AST : row.REB, row.AST >= row.REB ? 'ast' : 'reb'], [`${Math.round(fgPct(row))}%`, 'fg']],
    tags: tags.slice(0, 4).map(tag => `#${tag}`),
    tiles: [['MIN', s.MIN], ['REB', s.REB], ['AST', s.AST], ['STL', s.STL], ['BLK', s.BLK], ['+/-', s['+/-']], ['FG', s.FG], ['3PT', s['3PT']], ['FT', s.FT]],
    bars: quarters.map(([quarter, value]) => ({label: label(quarter), value})),
    assists: assists.slice(0, 3),
    foot: 'Points by quarter · box score',
  };
}

export default function PlayerGame({box, plays, team, player, onClose, nameOf}) {
  const code = codeOf(team.abbr), color = TEAMS[code]?.color ?? '#5b8def', accent = onDark(color);
  const own = box.away.abbr === team.abbr ? box.away : box.home, other = own === box.away ? box.home : box.away;
  const game = {team: team.abbr, opp: other.abbr, home: own === box.home, won: num(own.score) > num(other.score), score: `${own.score}–${other.score}`, date: box.date ? new Date(box.date) : null};
  const [quarter, setQuarter] = useState(0), [metric, setMetric] = useState('PTS');
  const {quarters, assisted} = useMemo(() => quarterStats(plays, player.id), [plays, player.id]);
  const periods = [...quarters.keys()].sort((a, b) => a - b);
  const all = total(quarters), shown = quarter ? total(quarters, quarter) : all;
  const s = player.stats, grade = rating(s), tags = tagsOf(all, s.MIN);
  const series = periods.map(period => [period, metric === 'PTS' ? total(quarters, period).PTS : fps(total(quarters, period))]);
  const top = Math.max(1, ...series.map(([, value]) => value));
  const assists = assisted.map(entry => ({...entry, name: nameOf(entry.id)})).filter(entry => entry.name);
  const assistPts = assisted.reduce((sum, entry) => sum + entry.pts, 0);
  const threes = all.TPM * 3, free = all.FTM, twos = Math.max(0, all.PTS - threes - free);
  const mix = [['2PT', twos], ['3PT', threes], ['FT', free]];
  const headline = [[shown.PTS, 'pts'], [shown.AST >= shown.REB ? shown.AST : shown.REB, shown.AST >= shown.REB ? 'ast' : 'reb'], [`${Math.round(fgPct(shown))}%`, 'fg']];
  const photo = id => team.players.find(entry => entry.id === id)?.photo;

  const cell = (name, value) => <div className="pg-cell" key={name}><strong>{value}</strong><small>{name}</small></div>;
  const done = (made, tried) => `${made}/${tried}`;

  return <section className="pg" style={{'--pg': accent}}>
    <button type="button" className="pg-back" onClick={onClose}><ArrowLeft size={15}/> Box score</button>

    <div className="pg-hero">
      {player.photo ? <img className="pg-photo" src={player.photo} alt=""/> : <i className="pg-photo"/>}
      <div className="pg-who">
        <h2>{player.name}</h2>
        <p><img src={team.logo} alt=""/>{team.abbr} {game.home ? 'vs' : '@'} {other.abbr} · <b className={game.won ? 'win' : 'loss'}>{game.won ? 'W' : 'L'} {game.score}</b></p>
        {game.date && <small>{dayFormat.format(game.date)}</small>}
      </div>
      <div className={`pg-rating ${tone(grade)}`}><strong>{grade.toFixed(1)}</strong><small>rating</small></div>
    </div>

    <div className="pg-headline">{headline.map(([value, unit]) => <span key={unit}><b>{value}</b> {unit}</span>)}</div>
    {tags.length > 0 && <div className="pg-tags">{tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}

    <div className="pg-tabs" role="group" aria-label="Quarter">
      {[0, ...periods].map(period => <button type="button" key={period} className={quarter === period ? 'active' : ''} onClick={() => setQuarter(period)}>{period ? label(period) : 'All'}</button>)}
    </div>
    <div className="pg-grid">
      {!quarter && cell('MIN', s.MIN)}
      {cell('PTS', shown.PTS)}{cell('REB', shown.REB)}{cell('AST', shown.AST)}{cell('STL', shown.STL)}{cell('BLK', shown.BLK)}
      {!quarter && cell('+/-', s['+/-'])}
      {cell('FG', done(shown.FGM, shown.FGA))}{cell('3PT', done(shown.TPM, shown.TPA))}{cell('FT', done(shown.FTM, shown.FTA))}
      {cell('TO', shown.TO)}{cell('PF', shown.PF)}{cell('OREB', shown.OREB)}{cell('DREB', shown.DREB)}
      {cell('FG%', shown.FGA ? fgPct(shown).toFixed(1) : '–')}{cell('TS%', shown.FGA || shown.FTA ? tsPct(shown).toFixed(1) : '–')}{cell('FPS', fps(shown))}
    </div>

    <div className="pg-card">
      <div className="pg-card-head"><h3>Quarter by quarter</h3>
        <span className="pg-pills">{[['PTS', 'Points'], ['FPS', 'Fantasy']].map(([key, name]) => <button type="button" key={key} className={metric === key ? 'active' : ''} onClick={() => setMetric(key)}>{name}</button>)}</span>
      </div>
      <div className="pg-bars">{series.map(([period, value]) => <button type="button" key={period} className={quarter === period ? 'on' : ''} onClick={() => setQuarter(quarter === period ? 0 : period)}>
        <b>{value}</b><i style={{height: `${Math.max(4, Math.max(0, value) / top * 100)}%`}}/><span>{label(period)}</span>
      </button>)}</div>
    </div>

    {assists.length > 0 && <div className="pg-card">
      <div className="pg-card-head"><h3>Assist breakdown</h3><span className="pg-note">{assistPts} pts created</span></div>
      <ul className="pg-assists">{assists.map(entry => <li key={entry.id}>
        {photo(entry.id) ? <img src={photo(entry.id)} alt=""/> : <i/>}
        <span><b>{entry.name}</b><small>{entry.pts} pts</small></span><strong>{entry.ast} ast</strong>
      </li>)}</ul>
    </div>}

    {all.PTS > 0 && <div className="pg-card">
      <div className="pg-card-head"><h3>Where the points came from</h3></div>
      <div className="pg-mix">{mix.filter(([, value]) => value > 0).map(([name, value]) => <i key={name} className={`m-${name}`} style={{flex: value}}/>)}</div>
      <div className="pg-mix-key">{mix.map(([name, value]) => <span key={name}><i className={`m-${name}`}/>{name} <b>{value}</b></span>)}</div>
    </div>}

    <div className="pg-share"><ShareButton spec={gameCard({player, row: all, tags, grade, quarters: series.length && metric === 'PTS' ? series : periods.map(period => [period, total(quarters, period).PTS]), assists: assists.map(entry => ({name: entry.name, pts: entry.pts, ast: entry.ast})), game, color})} filename={`${player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-game-report`} title={`${player.name} game report`} text={`${player.name}: ${all.PTS} pts, ${all.REB} reb, ${all.AST} ast ${game.home ? 'vs' : '@'} ${other.abbr}`} label="Share game report"/></div>
  </section>;
}
