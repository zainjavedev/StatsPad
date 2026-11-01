'use client';
import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Image as ImageIcon } from 'lucide-react';
import PerfShare from './PerfShare';
import StoryShare from './StoryShare';
import { nickname, TEAMS } from '../lib/teams';
import { gameUrl, playerUrl, SITE } from '../lib/routes';

/* The admin Post kit: last few nights' posts, ready to go. Each card has the picture (the same share cards the site uses) and a
   written post to copy. Big nights and streaks come from the stored box scores (/api/admin {feed}), ladder moves from ladders.json. */

const face = id => `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=260&h=190`;
const espn = code => (TEAMS[code]?.espn ?? code).toUpperCase();
const day = new Intl.DateTimeFormat(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
const f1 = value => Number(value || 0).toFixed(1);
const host = SITE.replace(/^https?:\/\//, '');

/* A night from the box scores, as the line the performance share card takes. */
function nightCard(line) {
  const home = line.team === line.home, own = home ? line.home_score : line.away_score, other = home ? line.away_score : line.home_score, won = own > other;
  const path = gameUrl(line.away, line.home, line.game_id);
  const stats = {MIN: String(line.minutes), PTS: String(line.pts), REB: String(line.reb), AST: String(line.ast), STL: String(line.stl), BLK: String(line.blk), TO: String(line.tov), PF: String(line.pf),
    FG: `${line.fgm}-${line.fga}`, '3PT': `${line.tpm}-${line.tpa}`, FT: `${line.ftm}-${line.fta}`, OREB: String(line.oreb), DREB: String(line.dreb), '+/-': line.plus_minus > 0 ? `+${line.plus_minus}` : String(line.plus_minus ?? 0)};
  const extras = [line.tpm >= 4 && `${line.tpm} threes`, line.stl >= 3 && `${line.stl} steals`, line.blk >= 3 && `${line.blk} blocks`].filter(Boolean);
  return {
    key: `n${line.game_id}${line.id}`, id: line.id, tags: line.tags, when: day.format(new Date(line.played_at)),
    title: line.name, line: `${line.pts} pts · ${line.reb} reb · ${line.ast} ast · ${line.fgm}/${line.fga} FG`,
    sub: `${won ? 'W' : 'L'} ${own}–${other} ${home ? 'vs' : '@'} ${nickname(line.opponent)}`,
    text: `${line.name}: ${line.pts} points, ${line.reb} rebounds, ${line.ast} assists on ${line.fgm}/${line.fga} shooting${extras.length ? `, ${extras.join(', ')}` : ''} in a ${own}–${other} ${won ? 'win' : 'loss'} ${home ? 'over' : 'at'} the ${nickname(line.opponent)}.\n\n${host}${path}`,
    path, share: {kind: 'perf', line: {gameId: line.game_id, player: {id: line.id, name: line.name, stats}, team: espn(line.team), opp: espn(line.opponent), score: `${own}–${other}`, won, date: new Date(line.played_at)}},
  };
}

const LADDERS = [['mvp', 'mvp', 'MVP'], ['rookie', 'roty', 'Rookie of the Year']];
function ladderCards(ladders) {
  if (!ladders) return [];
  return LADDERS.flatMap(([key, slug, label]) => (ladders[key] ?? []).filter(row => Math.abs(row.move || 0) >= 2 && row.rank <= 15)
    .sort((a, b) => Math.abs(b.move) - Math.abs(a.move)).slice(0, 4).map(row => {
      const up = row.move > 0, team = row.team, path = `/ladders/${slug}`;
      const stats = [[f1(row.pts), 'pts'], [f1(row.reb), 'reb'], [f1(row.ast), 'ast'], [row.ts ? `${f1(row.ts)}%` : '–', 'TS']];
      return {
        key: `l${key}${row.espnId}`, id: row.espnId, tags: [`${label} ladder`], when: `through ${ladders.through?.slice(5) ?? ''}`,
        title: row.name, line: `${up ? '▲' : '▼'} ${Math.abs(row.move)} to No. ${row.rank}`, sub: `${f1(row.pts)} pts · ${f1(row.reb)} reb · ${f1(row.ast)} ast`, up,
        text: `${row.name} ${up ? 'climbs' : 'drops'} ${Math.abs(row.move)} spots to No. ${row.rank} on the ${label} ladder: ${f1(row.pts)} points, ${f1(row.reb)} rebounds and ${f1(row.ast)} assists a game.\n\n${host}${path}`,
        path, share: {kind: 'story', story: {id: row.espnId, name: row.name, team, kicker: `${label} ladder`, big: `${up ? '+' : '−'}${Math.abs(row.move)}`, headline: `spots, ${up ? 'up' : 'down'} to No. ${row.rank}`, stats}},
      };
    }));
}

function streakCard(streak) {
  const path = playerUrl(streak.name), stats = [[f1(streak.season.pts), 'pts'], [f1(streak.season.reb), 'reb'], [f1(streak.season.ast), 'ast'], [streak.games, 'games']];
  const copy = streak.kind === 'thirty'
    ? {tag: '30-point streak', line: `${streak.count} straight 30-point games`, big: String(streak.count), headline: 'straight 30-point games', text: `${streak.name} has scored 30 or more in ${streak.count} straight games.`}
    : streak.kind === 'double'
      ? {tag: 'Double-double streak', line: `${streak.count} straight double-doubles`, big: String(streak.count), headline: 'straight double-doubles', text: `${streak.name} has ${streak.count} straight double-doubles.`}
      : {tag: 'Heating up', line: `${f1(streak.last3)} pts in his last 3 (${f1(streak.before)} before)`, big: f1(streak.last3), headline: `points a game over his last three, up from ${f1(streak.before)}`, text: `${streak.name} is averaging ${f1(streak.last3)} points over his last three games, up from ${f1(streak.before)} before that.`};
  return {
    key: `s${streak.kind}${streak.id}`, id: streak.id, tags: [copy.tag], when: `${streak.games} games`,
    title: streak.name, line: copy.line, sub: `${f1(streak.season.pts)} pts · ${f1(streak.season.reb)} reb · ${f1(streak.season.ast)} ast this season`,
    text: `${copy.text}\n\n${host}${path}`, path, share: {kind: 'story', story: {id: streak.id, name: streak.name, team: streak.team, kicker: copy.tag, big: copy.big, headline: copy.headline, stats}},
  };
}

function storyCard(game) {
  const awayWon = game.away_score > game.home_score, [winner, loser] = awayWon ? [game.away, game.home] : [game.home, game.away];
  const [high, low] = [Math.max(game.away_score, game.home_score), Math.min(game.away_score, game.home_score)], path = gameUrl(game.away, game.home, game.id);
  const blowout = game.margin >= 25;
  return {
    key: `g${game.id}`, teams: [game.away, game.home], tags: [blowout ? 'Blowout' : 'Close finish'], when: day.format(new Date(game.played_at)),
    title: `${nickname(game.away)} @ ${nickname(game.home)}`, line: `${nickname(winner)} ${high}–${low}`, sub: blowout ? `won by ${game.margin}` : `decided by ${game.margin}`,
    text: `${blowout ? `The ${nickname(winner)} ran the ${nickname(loser)} off the floor, ${high}–${low}.` : `The ${nickname(winner)} hold off the ${nickname(loser)}, ${high}–${low}.`} Full box score:\n\n${host}${path}`, path,
  };
}

function Card({card, onImage}) {
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard?.writeText(card.text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {});
  return <article className="pk-card">
    <div className="pk-art">{card.id ? <img src={face(card.id)} alt="" loading="lazy"/> : <span className="pk-teams">{card.teams.map(code => TEAMS[code] && <img key={code} src={`https://a.espncdn.com/i/teamlogos/nba/500/${TEAMS[code].espn}.png`} alt=""/>)}</span>}</div>
    <div className="pk-copy">
      <div className="pk-tags">{card.tags.map(tag => <span key={tag}>{tag}</span>)}<small>{card.when}</small></div>
      <b>{card.title}</b>
      <span className={`pk-line${card.up === false ? ' down' : ''}`}>{card.line}</span>
      <small>{card.sub}</small>
      <p className="pk-text">{card.text.split('\n\n')[0]}</p>
      <div className="pk-actions">
        {card.share && <button type="button" onClick={() => onImage(card.share)}><ImageIcon size={15}/> Image</button>}
        <button type="button" onClick={copy}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copied' : 'Copy post'}</button>
        <a href={card.path} target="_blank" rel="noreferrer" aria-label="Open the page"><ExternalLink size={15}/></a>
      </div>
    </div>
  </article>;
}

const TABS = [['nights', 'Big nights'], ['ladders', 'Ladder moves'], ['streaks', 'Streaks'], ['games', 'Games']];

export default function PostKit({load}) {
  const [feed, setFeed] = useState(null), [ladders, setLadders] = useState(null), [tab, setTab] = useState('nights'), [share, setShare] = useState(null);
  useEffect(() => {
    load().then(setFeed).catch(() => setFeed({nights: [], streaks: [], stories: []}));
    fetch('/data/2026-27/ladders.json', {cache: 'no-cache'}).then(response => response.json()).then(setLadders).catch(() => setLadders({}));
  }, [load]);
  const cards = {
    nights: (feed?.nights ?? []).map(nightCard), ladders: ladderCards(ladders), streaks: (feed?.streaks ?? []).map(streakCard), games: (feed?.stories ?? []).map(storyCard),
  };
  return <section className="adm-panel pk">
    <div className="adm-hd"><h2>Post kit</h2><p>last four nights, ready to post</p></div>
    <div className="adm-seg pk-tabs" role="group" aria-label="Kind">{TABS.map(([key, label]) => <button key={key} type="button" className={key === tab ? 'on' : ''} onClick={() => setTab(key)}>{label}{feed ? <small> {cards[key].length}</small> : null}</button>)}</div>
    {!feed ? <p className="adm-muted">Loading…</p> : !cards[tab].length ? <p className="adm-muted">Nothing here right now.</p>
      : <div className="pk-grid">{cards[tab].map(card => <Card key={card.key} card={card} onImage={setShare}/>)}</div>}
    {share?.kind === 'perf' && <PerfShare line={share.line} onClose={() => setShare(null)}/>}
    {share?.kind === 'story' && <StoryShare story={share.story} onClose={() => setShare(null)}/>}
  </section>;
}
