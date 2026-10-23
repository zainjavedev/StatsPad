import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import ShotChart, { Flow } from './ShotChart';
import { PerfCard } from './RecentPerformances';
import { bestOfNight, performancesOf } from '../lib/performances';
import { finished, loadSchedule } from '../lib/schedule';
import { flowOf, fps, quarterStats, rating, shotsOf, tagsOf, total, tsPct, fgPct } from '../lib/playerGame';

/* One player's night, told as a story: what he did in a sentence, where every shot came from, how the game
   swung while he scored, quarter by quarter, and who he set up. */

const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const dayFormat = new Intl.DateTimeFormat(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
const label = quarter => (quarter <= 4 ? `Q${quarter}` : quarter === 5 ? 'OT' : `${quarter - 4}OT`);
const tone = value => (value >= 8 ? 'great' : value >= 6 ? 'good' : value >= 4.5 ? 'ok' : 'poor');
const lastName = name => name.split(' ').slice(1).join(' ') || name;

export default function PlayerGame({gameId, box, plays, team, player, onClose, onPick, nameOf}) {
  const accent = 'var(--text-1)';
  const own = box.away.abbr === team.abbr ? box.away : box.home, other = own === box.away ? box.home : box.away;
  const away = own === box.away;
  const game = {team: team.abbr, opp: other.abbr, home: !away, won: num(own.score) > num(other.score), score: `${own.score}–${other.score}`, date: box.date ? new Date(box.date) : null};
  const [quarter, setQuarter] = useState(0), [metric, setMetric] = useState('PTS');
  const [moreTab, setMoreTab] = useState('game'), [recent, setRecent] = useState(null);
  useEffect(() => {
    if (moreTab !== 'recent' || recent) return undefined;
    let live = true;
    loadSchedule().then(all => finished(all.filter(game => !game.preseason), 10)).then(finals => bestOfNight(finals, 400)).then(found => {
      const seen = new Set();
      if (live) setRecent(found.filter(line => (seen.has(line.player.name) ? false : seen.add(line.player.name))).slice(0, 8));
    }).catch(() => { if (live) setRecent([]); });
    return () => { live = false; };
  }, [moreTab, recent]);
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
  const others = useMemo(() => performancesOf(box, gameId).filter(line => String(line.player.id) !== String(player.id)).sort((a, b) => b.rating - a.rating).slice(0, 4), [box, gameId, player.id]);
  const assistPts = assisted.reduce((sum, entry) => sum + entry.pts, 0);
  const photo = id => team.players.find(entry => entry.id === id)?.photo;
  const cell = (name, value) => <div className={`pg-cell${name === '+/-' ? (num(value) > 0 ? ' pos' : num(value) < 0 ? ' neg' : '') : ''}`} key={name}><strong>{value}</strong><small>{name}</small></div>;
  const done = (made, tried) => `${made}/${tried}`;

  return <section className="pg" style={{'--pg': accent, '--pgraw': '#3a3a3d'}}>
    <nav className="pg-crumbs" aria-label="Breadcrumb">
      <a href="/schedule">Schedule</a><ChevronRight size={14} aria-hidden="true"/>
      <button type="button" onClick={onClose}>{team.abbr} {game.home ? 'vs' : '@'} {other.abbr}</button><ChevronRight size={14} aria-hidden="true"/>
      <span aria-current="page">{player.name}</span>
    </nav>

    <div className="pg-cols">
    <div className="pg-main">
    <div className="pg-top">
    <div className="pg-hero">
      <span className="pg-number" aria-hidden="true">{all.PTS}</span>
      {player.photo ? <img className="pg-photo" src={player.photo} alt=""/> : <i className="pg-photo"/>}
      <div className="pg-who">
        <h2>{player.name.replace(/^(\S)\S*\s+/, '$1. ')}<span className="pg-fps"> · {fps(all)} fps</span></h2>
        <p className="pg-big"><b>{all.PTS}</b> pts <b>{all.REB}</b> reb <b>{all.AST}</b> ast</p>
        {game.date && <small>{dayFormat.format(game.date)}</small>}
      </div>
      <div className={`pg-rating ${tone(grade)}`}><strong>{grade.toFixed(1)}</strong><small>grade</small></div>
    </div>

    {tags.length > 0 && <div className="pg-tags">{tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}

    <div className="pg-tabrow">
    <div className="pg-tabs" role="group" aria-label="Quarter">
      {[0, ...periods].map(period => <button type="button" key={period} className={quarter === period ? 'active' : ''} onClick={() => setQuarter(period)}>{period ? label(period) : 'All'}</button>)}
    </div>
    <p className="pg-kicker"><img src={team.logo} alt={team.abbr}/><b className={game.won ? 'win' : 'loss'}>{game.score}</b><img src={other.logo} alt={other.abbr}/></p>
    </div>
    <div className="pg-grid">
      {!quarter && cell('MIN', s.MIN)}
      {cell('PTS', shown.PTS)}{cell('REB', shown.REB)}{cell('AST', shown.AST)}{cell('STL', shown.STL)}{cell('BLK', shown.BLK)}
      {!quarter && cell('+/-', s['+/-'])}
      {cell('FG', done(shown.FGM, shown.FGA))}{cell('3PT', done(shown.TPM, shown.TPA))}{cell('FT', done(shown.FTM, shown.FTA))}
      {cell('TO', shown.TO)}{cell('PF', shown.PF)}{cell('OREB', shown.OREB)}{cell('DREB', shown.DREB)}
      {cell('FG%', shown.FGA ? fgPct(shown).toFixed(1) : '–')}{cell('TS%', shown.FGA || shown.FTA ? tsPct(shown).toFixed(1) : '–')}{cell('FPS', fps(shown))}
    </div>
    </div>

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

    </div>
    <aside className="pg-side">
    {allShots.length > 0 && <div className="pg-card pg-shots">
      <ShotChart shots={shots} color={accent}/>
    </div>}

    {(others.length > 0 || moreTab === 'recent') && <div className="pg-card pg-more">
      <div className="pg-card-head"><h3>{moreTab === 'game' ? 'More from this game' : 'Top recent'}</h3>
        <span className="pg-pills">{[['game', 'This game'], ['recent', 'Top recent']].map(([key, name]) => <button type="button" key={key} className={moreTab === key ? 'active' : ''} onClick={() => setMoreTab(key)}>{name}</button>)}</span>
      </div>
      {moreTab === 'game'
        ? <ul className="rp-list">{others.map(line => <li key={line.player.id}><PerfCard line={line} onPick={onPick}/></li>)}</ul>
        : recent === null ? <ul className="rp-list loading">{[0, 1, 2].map(index => <li key={index}/>)}</ul>
          : <ul className="rp-list">{recent.filter(line => !(String(line.gameId) === String(gameId) && String(line.player.id) === String(player.id))).slice(0, 5).map(line => <li key={`${line.gameId}-${line.player.id}`}><PerfCard line={line}/></li>)}</ul>}
    </div>}
    </aside>
    </div>
  </section>;
}
