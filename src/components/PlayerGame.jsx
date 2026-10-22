import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import ShareButton from './ShareButton';
import ShotChart, { Flow } from './ShotChart';
import { TEAMS } from '../lib/teams';
import { onDark } from '../lib/share';
import { flowOf, fps, quarterStats, rating, shotsOf, storyOf, tagsOf, total, tsPct, fgPct } from '../lib/playerGame';

/* One player's night, told as a story: what he did in a sentence, where every shot came from, how the game
   swung while he scored, quarter by quarter, and who he set up. */

const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const dayFormat = new Intl.DateTimeFormat(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
const label = quarter => (quarter <= 4 ? `Q${quarter}` : quarter === 5 ? 'OT' : `${quarter - 4}OT`);
const tone = value => (value >= 8 ? 'great' : value >= 6 ? 'good' : value >= 4.5 ? 'ok' : 'poor');
const lastName = name => name.split(' ').slice(1).join(' ') || name;

export function gameCard({player, all, tags, grade, story, shots, assists, game, color}) {
  const s = player.stats;
  return {
    kind: 'perf', eyebrow: 'Game report', title: player.name, person: {name: player.name, espnId: player.id}, color,
    sub: `${game.team} ${game.home ? 'vs' : '@'} ${game.opp} · ${game.won ? 'W' : 'L'} ${game.score}${game.date ? ` · ${dayFormat.format(game.date)}` : ''}`,
    rating: grade.toFixed(1), tone: tone(grade), story,
    headline: [[all.PTS, 'pts'], [all.AST >= all.REB ? all.AST : all.REB, all.AST >= all.REB ? 'ast' : 'reb'], [`${Math.round(fgPct(all))}%`, 'fg']],
    tags: tags.slice(0, 3).map(tag => `#${tag}`),
    tiles: [['MIN', s.MIN], ['REB', s.REB], ['AST', s.AST], ['STL', s.STL], ['BLK', s.BLK], ['+/-', s['+/-']]],
    shots, shotLine: `${all.FGM}/${all.FGA} FG · ${all.TPM}/${all.TPA} 3PT · ${all.FTM}/${all.FTA} FT`,
    assists: assists.slice(0, 3),
    foot: 'Shot chart · play by play',
  };
}

export default function PlayerGame({box, plays, team, player, onClose, nameOf}) {
  const code = codeOf(team.abbr), color = TEAMS[code]?.color ?? '#5b8def', accent = onDark(color);
  const own = box.away.abbr === team.abbr ? box.away : box.home, other = own === box.away ? box.home : box.away;
  const away = own === box.away;
  const margin = Math.abs(num(own.score) - num(other.score));
  const game = {team: team.abbr, opp: other.abbr, home: !away, won: num(own.score) > num(other.score), score: `${own.score}–${other.score}`, date: box.date ? new Date(box.date) : null};
  const [quarter, setQuarter] = useState(0), [metric, setMetric] = useState('PTS');
  const {quarters, assisted} = useMemo(() => quarterStats(plays, player.id), [plays, player.id]);
  const allShots = useMemo(() => shotsOf(plays, player.id), [plays, player.id]);
  const flow = useMemo(() => flowOf(plays, player.id, away), [plays, player.id, away]);
  const periods = [...quarters.keys()].sort((a, b) => a - b);
  const all = total(quarters), shown = quarter ? total(quarters, quarter) : all;
  const s = player.stats, grade = rating(s), tags = tagsOf(all, s.MIN);
  const shots = quarter ? allShots.filter(shot => shot.q === quarter) : allShots;
  const series = periods.map(period => [period, metric === 'PTS' ? total(quarters, period).PTS : fps(total(quarters, period))]);
  const top = Math.max(1, ...series.map(([, value]) => value));
  const assists = assisted.map(entry => ({...entry, name: nameOf(entry.id)})).filter(entry => entry.name);
  const assistPts = assisted.reduce((sum, entry) => sum + entry.pts, 0);
  const story = storyOf({name: player.name, row: all, quarters, won: game.won, margin, team: team.abbr, opp: other.abbr});
  const photo = id => team.players.find(entry => entry.id === id)?.photo;
  const cell = (name, value) => <div className="pg-cell" key={name}><strong>{value}</strong><small>{name}</small></div>;
  const done = (made, tried) => `${made}/${tried}`;
  const sharable = gameCard({player, all, tags, grade, story: `${story.lead} ${story.rest}`, shots: allShots.map(({x, y, made}) => ({x, y, made})), assists: assists.map(entry => ({name: entry.name, pts: entry.pts, ast: entry.ast})), game, color});

  return <section className="pg" style={{'--pg': accent, '--pgraw': color}}>
    <button type="button" className="pg-back" onClick={onClose}><ArrowLeft size={15}/> Box score</button>

    <div className="pg-hero">
      <span className="pg-number" aria-hidden="true">{all.PTS}</span>
      {player.photo ? <img className="pg-photo" src={player.photo} alt=""/> : <i className="pg-photo"/>}
      <div className="pg-who">
        <p className="pg-kicker"><img src={team.logo} alt=""/>{team.abbr} {game.home ? 'vs' : '@'} {other.abbr} · <b className={game.won ? 'win' : 'loss'}>{game.won ? 'W' : 'L'} {game.score}</b></p>
        <h2>{player.name}</h2>
        {game.date && <small>{dayFormat.format(game.date)}</small>}
      </div>
      <div className={`pg-rating ${tone(grade)}`}><strong>{grade.toFixed(1)}</strong><small>grade</small></div>
    </div>

    <p className="pg-story"><b>{story.lead}</b> {story.rest}</p>
    {tags.length > 0 && <div className="pg-tags">{tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}

    <div className="pg-tabs" role="group" aria-label="Quarter">
      {[0, ...periods].map(period => <button type="button" key={period} className={quarter === period ? 'active' : ''} onClick={() => setQuarter(period)}>{period ? label(period) : 'Full game'}</button>)}
    </div>
    <div className="pg-grid">
      {!quarter && cell('MIN', s.MIN)}
      {cell('PTS', shown.PTS)}{cell('REB', shown.REB)}{cell('AST', shown.AST)}{cell('STL', shown.STL)}{cell('BLK', shown.BLK)}
      {!quarter && cell('+/-', s['+/-'])}
      {cell('FG', done(shown.FGM, shown.FGA))}{cell('3PT', done(shown.TPM, shown.TPA))}{cell('FT', done(shown.FTM, shown.FTA))}
      {cell('TO', shown.TO)}{cell('PF', shown.PF)}{cell('OREB', shown.OREB)}{cell('DREB', shown.DREB)}
      {cell('FG%', shown.FGA ? fgPct(shown).toFixed(1) : '–')}{cell('TS%', shown.FGA || shown.FTA ? tsPct(shown).toFixed(1) : '–')}{cell('FPS', fps(shown))}
    </div>

    {allShots.length > 0 && <div className="pg-card">
      <div className="pg-card-head"><h3>Shot chart</h3><span className="pg-note">{shots.filter(shot => shot.made).length} of {shots.length} {quarter ? label(quarter) : 'from the floor'}</span></div>
      <ShotChart shots={shots} color={accent}/>
      <div className="pg-key"><span><i className="make"/>Made</span><span><i className="miss"/>Missed</span></div>
    </div>}

    {flow.points.length > 2 && <div className="pg-card">
      <div className="pg-card-head"><h3>How the game swung</h3><span className="pg-note">{team.abbr} lead · dots are his baskets</span></div>
      <Flow flow={flow} color={accent} quarters={periods.length}/>
      <div className="pg-axis">{periods.map(period => <span key={period}>{label(period)}</span>)}</div>
    </div>}

    <div className="pg-card">
      <div className="pg-card-head"><h3>Quarter by quarter</h3>
        <span className="pg-pills">{[['PTS', 'Points'], ['FPS', 'Fantasy']].map(([key, name]) => <button type="button" key={key} className={metric === key ? 'active' : ''} onClick={() => setMetric(key)}>{name}</button>)}</span>
      </div>
      <div className="pg-bars">{series.map(([period, value]) => <button type="button" key={period} className={quarter === period ? 'on' : ''} onClick={() => setQuarter(quarter === period ? 0 : period)}>
        <b>{value}</b><i style={{height: `${Math.max(4, Math.max(0, value) / top * 100)}%`}}/><span>{label(period)}</span>
      </button>)}</div>
    </div>

    {assists.length > 0 && <div className="pg-card">
      <div className="pg-card-head"><h3>Who he set up</h3><span className="pg-note">{assistPts} points created</span></div>
      <ul className="pg-assists">{assists.map(entry => <li key={entry.id}>
        {photo(entry.id) ? <img src={photo(entry.id)} alt=""/> : <i/>}
        <span><b>{lastName(entry.name)}</b><small>{entry.pts} pts</small></span><strong>{entry.ast} ast</strong>
      </li>)}</ul>
    </div>}

    <div className="pg-share"><ShareButton spec={sharable} filename={`${player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-game-report`} title={`${player.name} game report`} text={`${player.name}: ${all.PTS} pts, ${all.REB} reb, ${all.AST} ast ${game.home ? 'vs' : '@'} ${other.abbr}`} label="Share game report"/></div>
  </section>;
}
