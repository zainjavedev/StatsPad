import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import ShareSheet from './ShareSheet';
import ShotChart from './ShotChart';
import { loadBoxscore } from '../lib/boxscore';
import { assistShotsOf, fgPct, fps, quarterStats, rating, shotsOf, tagsOf, total, tsPct } from '../lib/playerGame';
import { trio } from '../lib/trio';
import { siteOrigin } from '../lib/share';

/* The photo maker behind the share icon on a performance card: a picture of the player's night (stats,
   shot chart) with the ways to send it. The picture is the actual card on screen, captured at 1080 pixels wide. */

const day = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'}), shortDay = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'});
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const done = (made, tried) => `${made}/${tried}`;
const tone = grade => (grade >= 7.5 ? 'great' : grade >= 5.5 ? 'good' : grade >= 4 ? 'fair' : 'poor');

const Poster = forwardRef(function Poster({line, box, chart}, ref) {
  const {player} = line, id = player.id;
  const {quarters} = useMemo(() => quarterStats(box.plays, id), [box, id]);
  const all = total(quarters);
  const shots = useMemo(() => shotsOf(box.plays, id), [box, id]);
  const assists = useMemo(() => assistShotsOf(box.plays, id), [box, id]);
  const s = player.stats, grade = rating(s), tags = tagsOf(all, s.MIN, {won: num(box.away.abbr === line.team ? box.away.score : box.home.score) > num(box.away.abbr === line.team ? box.home.score : box.away.score), margin: Math.abs(num(box.away.score) - num(box.home.score)), quarters, plays: box.plays, id, teamId: (box.away.abbr === line.team ? box.away : box.home).id, away: box.away.abbr === line.team, starter: player.starter});
  const own = line.team === box.away.abbr ? box.away : box.home, other = own === box.away ? box.home : box.away;
  const won = num(own.score) > num(other.score);
  const cell = (label, value) => <span key={label} className={label === '+/-' ? (num(value) > 0 ? 'pos' : num(value) < 0 ? 'neg' : '') : ''}><b>{value}</b>{label}</span>;
  const name = player.name.replace(/^(\S)\S*\s+/, '$1. ');
  return <div className={chart ? 'sp has-chart' : 'sp'} ref={ref}>
    <div className="sp-cols">
      <div className="sp-left">
        <div className="rp-card sp-card">
          <span className="rp-face">{player.photo ? <img src={player.photo} alt="" crossOrigin="anonymous"/> : <i/>}<img className="rp-team" src={own.logo} alt="" crossOrigin="anonymous"/></span>
          <span className="rp-main">
            <span className="rp-top"><b>{name}</b><small> · {fps(all)} fps{line.date ? ` · ${shortDay.format(line.date)}` : ''}</small></span>
            <span className="rp-trio">{trio(s).map(([value, label]) => <span key={label}><b>{value}</b>{label}</span>)}</span>
          </span>
          <span className={`rp-grade ${tone(grade)}`}>{grade.toFixed(1)}</span>
        </div>
        {tags.length > 0 && <p className="sp-tags">{tags.map(tag => <span key={tag}>#{tag}</span>)}</p>}
        <div className="sp-pos"><span>{player.pos || 'Player'} · {s.MIN} min</span><small className="rp-game"><img src={own.logo} alt="" crossOrigin="anonymous"/><b className={won ? 'win' : ''}>{own.score}</b>–<b className={won ? '' : 'win'}>{other.score}</b><img src={other.logo} alt="" crossOrigin="anonymous"/></small></div>
        <div className="sp-st">
          <p>{cell('PTS', all.PTS)}{cell('REB', all.REB)}{cell('AST', all.AST)}{cell('STL', all.STL)}{cell('BLK', all.BLK)}{cell('+/-', s['+/-'])}{cell('FG%', all.FGA ? fgPct(all).toFixed(1) : '–')}{cell('FPS', fps(all))}</p>
          <p>{cell('FG', done(all.FGM, all.FGA))}{cell('3PT', done(all.TPM, all.TPA))}{cell('FT', done(all.FTM, all.FTA))}{cell('TO', all.TO)}{cell('PF', all.PF)}{cell('OREB', all.OREB)}{cell('DREB', all.DREB)}{cell('TS%', all.FGA || all.FTA ? tsPct(all).toFixed(1) : '–')}</p>
        </div>
      </div>
      {chart && <div className="sp-court">
        <ShotChart shots={shots} assists={assists} className="sp-chart"/>
        <p className="pg-legend shot-key"><span><i className="made"/>Made</span><span><i className="missed"/>Missed</span>{assists.length > 0 && <span><i className="assist"/>Assisted</span>}</p>
      </div>}
    </div>
    <p className="sp-foot"><b>statspads.com</b><span>{line.date ? day.format(line.date) : ''}</span></p>
  </div>;
});

export default function PerfShare({line, onClose}) {
  const [box, setBox] = useState(null), [chart, setChart] = useState(false);
  useEffect(() => {
    let live = true;
    loadBoxscore(line.gameId).then(found => { if (live) setBox(found); }).catch(() => { if (live) setBox(false); });
    return () => { live = false; };
  }, [line.gameId]);
  return <ShareSheet ready={Boolean(box)} failed={box === false} unavailable="This game is not available yet." onClose={onClose}
    filename={`${line.player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${line.gameId}`} title={line.player.name}
    text={`${line.player.name}: ${trio(line.player.stats).map(([value, label]) => `${value} ${label}`).join(', ')} (${line.team} ${line.score})`}
    url={`${siteOrigin()}/games/${line.gameId}?player=${line.player.id}`}
    options={<button type="button" className="ss-chip" aria-pressed={chart} onClick={() => setChart(on => !on)}>Shot chart</button>}>
    {ref => <Poster ref={ref} line={line} box={box} chart={chart}/>}
  </ShareSheet>;
}
