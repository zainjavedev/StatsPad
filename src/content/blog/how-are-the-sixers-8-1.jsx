import React from 'react';
import { FlowGrid, GameFlow, PairBars, QuarterBars, RecordBars, TeamScatter } from '../../components/blog/TeamCharts';
import { espnHeadshotUrl, logoUrl } from '../../lib/teams';
import { playerUrl, teamUrl } from '../../lib/routes';
import DATA from './data/sixers-8-1.json';

/* Every number comes from the pinned snapshot in data/sixers-8-1.json (all games through Nov 4, 2026), so the prose
   and the charts agree after the stats bot moves the live season on. Close games, quarters and comebacks were counted
   from ESPN play-by-play when the snapshot was taken. */
const FOCUS = 'PHI';

const ORD = n => `${n}${(n % 100 > 10 && n % 100 < 14) ? 'th' : ({1: 'st', 2: 'nd', 3: 'rd'})[n % 10] ?? 'th'}`;

/* A headline number. `rank` (1 = best of 30) draws the league strip under it; `player` turns the block into a link to
   that player's page with his face on it. */
function Stat({value, rank, player, children}) {
  const tone = rank ? (rank <= 10 ? ' good' : rank >= 20 ? ' bad' : '') : '';
  const body = <>
    {player && <img className="sx-stat-face" src={espnHeadshotUrl(player.id)} alt=""/>}
    <b>{value}</b>
    {rank && !/^\d+(st|nd|rd|th)$/.test(value) && <em className="sx-rank">{ORD(rank)} in the NBA</em>}
    <span>{children}</span>
    {rank && <span className="sx-meter" role="img" aria-label={`${ORD(rank)} of 30 teams`}>
      {Array.from({length: 30}, (_, i) => <i key={i} className={i + 1 === rank ? 'on' : ''}/>)}
    </span>}
    {rank && <small className="sx-meter-key"><span>Best</span><span>Worst</span></small>}
  </>;
  return player ? <a className={`sx-stat linked${tone}`} href={playerUrl(player.name)}>{body}</a> : <div className={`sx-stat${tone}`}>{body}</div>;
}

export default function Post() {
  const {teams, games, quarters, turnovers, players} = DATA;
  const phi = teams.find(t => t.t === FOCUS);
  const record = t => `${t.w}–${t.l}`;
  const defense = teams.map(t => ({code: t.t, x: t.ppg, y: t.oppg, title: `${t.t} ${record(t)}: scores ${t.ppg}, allows ${t.oppg}`}));
  const margin = teams.map(t => ({code: t.t, x: t.net, y: t.w / (t.w + t.l), title: `${t.t} ${record(t)}, margin ${t.net > 0 ? '+' : ''}${t.net} a game`,
    label: t.t === FOCUS || t.t === 'MIN' ? `${t.net > 0 ? '+' : ''}${t.net}, ${record(t)}${t.t === 'MIN' ? ' (MIN)' : ''}` : undefined}));
  const close = [...teams].sort((a, b) => b.cw - a.cw || a.cl - b.cl).slice(0, 8).map(t => ({code: t.t, w: t.cw, l: t.cl}));
  const cleveland = games.find(g => g.opp === 'CLE');
  const maxey = players.find(p => p.name === 'Tyrese Maxey');
  const maxeyLink = <a href={playerUrl(maxey.name)}>Maxey</a>;

  return <>
    <div className="sx-hero">
      <b>{record(phi)}</b>
      <span>Best record in the NBA</span>
    </div>
    <p>Now look up the usual team rankings. Philadelphia sits in the bottom half almost everywhere:</p>
    <div className="sx-ranks">
      <Stat value="20th" rank={20}>points scored</Stat>
      <Stat value="21st" rank={21}>rebounds</Stat>
      <Stat value="23rd" rank={23}>shooting efficiency</Stat>
      <Stat value="26th" rank={26}>threes made</Stat>
      <Stat value="28th" rank={28}>offensive rebounds</Stat>
    </div>
    <p>Every one of those is about scoring. Philly wins everywhere else.</p>

    <h2 className="sx-h">1. They stop you from scoring</h2>
    <p>Further right means more points scored, higher means fewer points allowed. Philly is a middling offense with one of the best defenses in the league.</p>
    <TeamScatter teams={defense} focus={FOCUS}
      x={{label: 'Points scored per game', min: 96, max: 125, ticks: [100, 106, 112, 118, 124]}}
      y={{label: 'Fewer points allowed', min: 100, max: 132, ticks: [104, 110, 116, 122, 128]}} flipY
      corners={[['Good at both ends', 'tr'], ['Scores a lot, allows a lot', 'br']]}
      caption="Per game, all 30 teams. Hover a logo for the numbers."/>
    <div className="sx-stats">
      <Stat value="105.2" rank={3}>points allowed a game</Stat>
      <Stat value="43.5%" rank={7}>opponents’ shooting</Stat>
      <Stat value="31.8%" rank={9}>opponents from three</Stat>
    </div>
    <p>It isn’t because their games are slow, either. Philly plays at league-average speed and still allows the 3rd fewest points per 100 possessions.</p>

    <h2 className="sx-h">2. They don’t give the ball away</h2>
    <p>A turnover hands the other team a free possession, often an easy layup going the other way. Philly commits {turnovers.committed.toFixed(1)} a game, 2nd fewest in the league, and forces {turnovers.forced.toFixed(1)}.</p>
    <PairBars unit="points a game" rows={[
      {label: 'Philly’s points off turnovers', note: 'After the other team loses the ball. 4th most in the NBA', value: turnovers.scoredOff, logo: 'PHI'},
      {label: 'Other teams’ points off turnovers', note: 'After Philly loses the ball. 6th fewest in the NBA', value: turnovers.allowedOff, logo: 'NBA'},
    ]} caption="Points scored straight after a turnover, per game."/>
    <p className="sx-callout">That {(turnovers.scoredOff - turnovers.allowedOff).toFixed(1)}-point swing is nearly their whole winning margin of +{phi.net} a game. Without the turnover battle, Philly would be about an even team.</p>

    <h2 className="sx-h">3. They save their best for the 4th quarter</h2>
    <p>On average Philly is behind after the 1st quarter. Then they win every quarter after it, and the 4th by the most.</p>
    <QuarterBars quarters={quarters} team="Philly" caption="Average point margin by quarter. Above zero means Philly won that quarter."/>
    <div className="sx-stats">
      <Stat value={`+${quarters[3].toFixed(1)}`} rank={3}>4th-quarter margin a game</Stat>
      <Stat value="11.0" player={maxey}>4th-quarter points a game from Tyrese Maxey alone</Stat>
    </div>

    <h2 className="sx-h">4. They don’t lose close games</h2>
    <p>A close game here means within 5 points at some point in the last 5 minutes. Philly has played more of them than anyone and won all {phi.cw}.</p>
    <RecordBars rows={close} focus={FOCUS} caption="Close-game records for the eight teams with the most close wins."/>
    <div className="sx-stats">
      <Stat value={`${phi.cw}–${phi.cl}`} rank={1}>in close games. Nobody else has more than 4 wins</Stat>
      <Stat value="+27" rank={1}>points better than opponents in those final minutes</Stat>
      <Stat value="34" player={maxey}>of those late points scored by Maxey</Stat>
    </div>

    <h2 className="sx-h">5. Falling behind doesn’t rattle them</h2>
    <p>They have won four games after trailing by 10 or more, the most in the league. The wildest one: down {-cleveland.low} to <a href={teamUrl('CLE')}>Cleveland</a> in the 2nd quarter, and they won by {cleveland.pts - cleveland.oppPts}.</p>
    <GameFlow game={cleveland} team="Philly" caption="Philly's lead (above the line) or deficit (below) through the Oct. 22 win over Cleveland."/>
    <FlowGrid games={games} team="Philly" caption="All nine games in order. Blue is Philly ahead, orange is behind."/>

    <h2 className="sx-h">The players doing it</h2>
    <ul className="sx-players">
      {players.map(player => <li key={player.id}>
        <a href={playerUrl(player.name)}>
          <span className="sx-face"><img src={espnHeadshotUrl(player.id)} alt="" loading="lazy"/></span>
          <span className="sx-body">
            <b>{player.name}</b>
            <strong>{player.big} <small>{player.unit}</small></strong>
            <span>{player.line}</span>
          </span>
        </a>
      </li>)}
      <li>
        <a className="sx-roster" href={teamUrl('PHI')}>
          <span className="sx-face"><img src={logoUrl('PHI')} alt=""/></span>
          <span className="sx-body"><b>The full Sixers roster</b><span>Every player’s stats and the expected starting five.</span></span>
        </a>
      </li>
    </ul>

    <h2 className="sx-h">Is it real?</h2>
    <p>Partly. A team that wins by about 6 points a game usually goes about 6–3 over nine games, not 8–1. Philly sits well above the line. Minnesota has the best margin in the league and is only 6–3.</p>
    <TeamScatter teams={margin} focus={FOCUS} labels={['MIN']} trend
      x={{label: 'Average point margin', min: -20, max: 13, ticks: [-20, -10, 0, 10], signed: true}}
      y={{label: 'Win %', min: 0, max: 1, ticks: [0, .25, .5, .75, 1], pct: true}}
      caption="The line is what a margin usually earns. Above it means winning more than the margin suggests."/>
    <ul className="sx-verdict">
      <li><b>Real:</b> the defense and the low turnovers. Both tend to hold up over a season.</li>
      <li><b>Real:</b> {maxeyLink} closing games. A guard who scores 11 in a 4th quarter wins close ones.</li>
      <li><b>Some luck:</b> 7–0 in close games. Those swing on one or two shots, and perfect records rarely last.</li>
      <li><b>Not the schedule:</b> their opponents have won 51% of their other games, about average.</li>
      <li><b>Too early to say:</b> nine games is about 11% of a season.</li>
    </ul>
    <p><b>In one line:</b> Philly doesn’t beat you with highlight stats. They defend, they keep the ball, and they win the last five minutes.</p>
    <p>See where they stand now on the <a href="/standings">standings</a>, or put them next to anyone on the <a href={`/compare`}>compare page</a>.</p>
    <p className="blog-note">Numbers cover every 2026–27 regular-season game through November 4, from ESPN box scores and play-by-play. Close games, quarter margins and comebacks were counted from the play-by-play. Points per 100 possessions use field-goal attempts − offensive rebounds + turnovers + 0.44 × free-throw attempts.</p>
  </>;
}
