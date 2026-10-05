import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';

/* Season leaderboards on the shell's neutral surfaces: one card per stat,
   grouped by what the stat measures, with a top-25 sheet behind each card. */

const pctKeys = new Set(['fieldGoalPercentage', 'threePointPercentage', 'freeThrowPercentage', 'trueShootingPercentage', 'effectiveFieldGoalPercentage']);
const trueShooting = stats => stats.fieldGoalsAttempted ? stats.points / (2 * (stats.fieldGoalsAttempted + 0.44 * stats.freeThrowsAttempted)) * 100 : 0;
const valueOf = (player, key) => key === 'trueShootingPercentage' ? trueShooting(player.stats)
  : key === 'stocks' ? player.stats.steals + player.stats.blocks
  : key === 'minutesPerGame' ? player.minutesPerGame
  : player.stats[key];
const show = (value, key) => `${Number(value).toFixed(1)}${pctKeys.has(key) ? '%' : ''}`;

const GROUPS = [
  {key: 'scoring', label: 'Scoring', stats: [
    {key: 'points', label: 'Points', unit: 'PPG'},
    {key: 'threePointersMade', label: 'Threes made', unit: '3PM'},
    {key: 'freeThrowsMade', label: 'Free throws made', unit: 'FTM'},
    {key: 'fieldGoalsMade', label: 'Field goals made', unit: 'FGM'},
  ]},
  {key: 'playmaking', label: 'Playmaking', stats: [
    {key: 'assists', label: 'Assists', unit: 'APG'},
    {key: 'minutesPerGame', label: 'Minutes', unit: 'MPG'},
  ]},
  {key: 'rebounding', label: 'Rebounding', stats: [
    {key: 'totalRebounds', label: 'Rebounds', unit: 'RPG'},
    {key: 'offensiveRebounds', label: 'Offensive rebounds', unit: 'ORB'},
    {key: 'defensiveRebounds', label: 'Defensive rebounds', unit: 'DRB'},
  ]},
  {key: 'defense', label: 'Defense', stats: [
    {key: 'steals', label: 'Steals', unit: 'SPG'},
    {key: 'blocks', label: 'Blocks', unit: 'BPG'},
    {key: 'stocks', label: 'Steals + blocks', unit: 'STK'},
  ]},
  {key: 'shooting', label: 'Shooting', stats: [
    {key: 'trueShootingPercentage', label: 'True shooting', unit: 'TS%'},
    {key: 'fieldGoalPercentage', label: 'Field goal %', unit: 'FG%'},
    {key: 'threePointPercentage', label: 'Three-point %', unit: '3P%'},
    {key: 'freeThrowPercentage', label: 'Free throw %', unit: 'FT%'},
  ]},
];

/* Regulars only (15+ games and 10+ minutes; 3+ games for playoff data), and
   shooting percentages need real volume behind them. */
function eligible(players, key) {
  const minGames = Math.max(0, ...players.map(player => player.gamesPlayed)) >= 40 ? 15 : 3;
  const pool = players.filter(player => player.gamesPlayed >= minGames && player.minutesPerGame >= 10);
  if (key === 'threePointPercentage') return pool.filter(player => player.stats.threePointersAttempted >= 3);
  if (key === 'freeThrowPercentage') return pool.filter(player => player.stats.freeThrowsAttempted >= 2);
  if (key === 'fieldGoalPercentage' || key === 'trueShootingPercentage') return pool.filter(player => player.stats.fieldGoalsAttempted >= 8);
  return pool;
}

function LeaderCard({title, rows, Art, playerIds, onOpen, onMore}) {
  const [first, ...rest] = rows;
  if (!first) return null;
  return <article className="lb-card">
    <h3>{title}</h3>
    <button className="lb-first" onClick={() => onOpen(first.player)}>
      <Art entity={first.player} playerIds={playerIds} className="lb-first-art"/>
      <span><b>{first.player.playerName}</b><small>{first.player.currentTeam || first.player.team}</small></span>
      <strong>{first.value}<em>{first.unit}</em></strong>
    </button>
    <ol start={2}>{rest.slice(0, 4).map((row, index) => <li key={row.player.playerId}>
      <button onClick={() => onOpen(row.player)}>
        <span className="lb-rank">{index + 2}</span>
        <Art entity={row.player} playerIds={playerIds} className="lb-art"/>
        <b>{row.player.playerName}</b>
        <strong>{row.value}</strong>
      </button>
    </li>)}</ol>
    {rows.length > 5 && <button className="lb-more" onClick={onMore}>Top {rows.length}</button>}
  </article>;
}

function TopSheet({sheet, Art, playerIds, onOpen, onClose}) {
  return <div className="lb-sheet-backdrop" onClick={onClose}>
    <section className="lb-sheet" role="dialog" aria-label={sheet.title} onClick={event => event.stopPropagation()}>
      <div className="lb-sheet-head"><div><small>{sheet.caption}</small><h2>{sheet.title}</h2></div><button onClick={onClose} aria-label="Close"><X size={18}/></button></div>
      <ol>{sheet.rows.map((row, index) => <li key={row.player.playerId}>
        <button onClick={() => onOpen(row.player)}>
          <span className="lb-rank">{index + 1}</span>
          <Art entity={row.player} playerIds={playerIds} className="lb-art"/>
          <span className="lb-sheet-who"><b>{row.player.playerName}</b><small>{row.player.currentTeam || row.player.team}</small></span>
          <strong>{row.value}</strong>
        </button>
      </li>)}</ol>
    </section>
  </div>;
}

export default function LeadersPage({players, splits, playerIds, Art, onOpen, seasonLabel, seasonType, onSeasonTypeChange, hasPlayoffs, seasonChanging}) {
  const [group, setGroup] = useState('all'), [sheet, setSheet] = useState(null);
  const byId = useMemo(() => new Map(players.map(player => [player.playerId, player])), [players]);
  const boards = useMemo(() => GROUPS.map(entry => ({...entry, cards: entry.stats.map(stat => ({
    ...stat,
    rows: [...eligible(players, stat.key)].sort((a, b) => valueOf(b, stat.key) - valueOf(a, stat.key)).slice(0, 25)
      .map(player => ({player, value: show(valueOf(player, stat.key), stat.key), unit: stat.unit})),
  }))})), [players]);
  const clutch = useMemo(() => {
    if (!splits || seasonType !== 'regular-season') return null;
    const quarter = Object.entries(splits.quarters).map(([name, leaders]) => ({
      key: name, label: `${name} scoring`, caption: 'Points per game in the quarter',
      rows: leaders.map(leader => ({player: byId.get(leader.playerId) || leader, value: leader.pts.toFixed(1), unit: 'PPG'})),
    }));
    const close = splits.clutch?.length ? [{
      key: 'clutch', label: 'Close games', caption: 'Total points in games decided by 5 or fewer',
      rows: splits.clutch.map(leader => ({player: byId.get(leader.playerId) || leader, value: `${leader.clutchPoints}`, unit: `PTS · ${leader.games} G`})),
    }] : [];
    return {key: 'clutch', label: 'Quarters & clutch', cards: [...quarter, ...close]};
  }, [splits, seasonType, byId]);
  const sections = [...boards, ...(clutch ? [clutch] : [])].filter(section => group === 'all' || section.key === group);
  const open = player => player.stats && onOpen(player);

  return <section className={`leaders-page ${seasonChanging ? 'is-changing' : ''}`}>
    <div className="lb-head">
      <h1>{seasonLabel} leaders</h1>
      {hasPlayoffs && <div className="segmented lb-season" role="group" aria-label="Season type">
        <button className={seasonType === 'regular-season' ? 'active' : ''} onClick={() => onSeasonTypeChange('regular-season')}>Regular season</button>
        <button className={seasonType === 'playoffs' ? 'active' : ''} onClick={() => onSeasonTypeChange('playoffs')}>Playoffs</button>
      </div>}
    </div>
    <div className="lb-chips" role="group" aria-label="Category">
      {[{key: 'all', label: 'All'}, ...boards, ...(clutch ? [clutch] : [])].map(entry => <button key={entry.key} className={group === entry.key ? 'active' : ''} onClick={() => setGroup(entry.key)}>{entry.label}</button>)}
    </div>
    {sections.map(section => <section className="lb-section" key={section.key}>
      <h2>{section.label}</h2>
      <div className="lb-grid">{section.cards.map(card => <LeaderCard key={card.key} title={card.label} rows={card.rows} Art={Art} playerIds={playerIds} onOpen={open}
        onMore={() => setSheet({title: card.label, caption: card.caption || `${seasonLabel} ${seasonType === 'playoffs' ? 'playoffs' : 'regular season'} · ${card.unit}`, rows: card.rows})}/>)}</div>
    </section>)}
    <p className="lb-note">Leaders are regulars only: 15+ games and 10+ minutes a game (3+ games in the playoffs). Shooting percentages also need volume: 8+ shots, 3+ threes or 2+ free throws a game.</p>
    {sheet && <TopSheet sheet={sheet} Art={Art} playerIds={playerIds} onOpen={player => { setSheet(null); open(player); }} onClose={() => setSheet(null)}/>}
  </section>;
}
