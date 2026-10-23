import React from 'react';
import BlogRadar from './BlogRadar';
import { radarAxes, radarTints } from '../../lib/radarAxes';
import { teamUrl, playerUrl } from '../../lib/routes';
import { teamCodeOf } from '../../lib/teams';
import { fixed, trueShooting } from '../../lib/blogData';

/* Things a post can drop in. Each one takes the pinned season, so the figure and the sentences around it use the same numbers. */

export function Caption({children}) { return <figcaption>{children}</figcaption>; }

/* Two players' season lines side by side, for the moment a post introduces them. */
export function PlayerCards({a, b, caption}) {
  return <figure className="blog-fig">
    <div className="blog-cards">
      {[a, b].map(player => {
        const code = teamCodeOf(player.team);
        return <div className="blog-card" key={player.playerId}>
          <a href={playerUrl(player.playerName)}><b>{player.playerName}</b></a>
          <small>{code ? <a href={teamUrl(code)}>{player.team}</a> : player.team} · {player.gamesPlayed} games · {fixed(player.minutesPerGame)} MPG</small>
          <dl>
            <div><dt>PPG</dt><dd>{fixed(player.stats.points)}</dd></div>
            <div><dt>RPG</dt><dd>{fixed(player.stats.totalRebounds)}</dd></div>
            <div><dt>APG</dt><dd>{fixed(player.stats.assists)}</dd></div>
            <div><dt>TS%</dt><dd>{fixed(trueShooting(player.stats))}</dd></div>
          </dl>
        </div>;
      })}
    </div>
    <Caption>{caption}</Caption>
  </figure>;
}

/* The compare page's radar, scaled against the season's qualified players. */
export function RadarFigure({season, a, b, caption}) {
  const axes = radarAxes(a, b, season.pool);
  return <figure className="blog-fig blog-radar" style={radarTints(a, b)}>
    <BlogRadar axes={axes} names={[a.playerName, b.playerName]}/>
    <Caption>{caption}</Caption>
  </figure>;
}

/* A ranked table with the players the post is about picked out. */
export function RankTable({rows, columns, highlight = [], caption, label}) {
  return <figure className="blog-fig">
    <div className="blog-table-wrap">
      <table>
        <caption>{label}</caption>
        <thead><tr><th>#</th><th>Player</th>{columns.map(column => <th key={column.label}>{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((player, index) => <tr key={player.playerId} className={highlight.includes(player.playerId) ? 'hl' : ''}>
          <td>{index + 1}</td>
          <td><a href={playerUrl(player.playerName)}>{player.playerName}</a> <small>{player.team}</small></td>
          {columns.map(column => <td key={column.label}>{column.get(player)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <Caption>{caption}</Caption>
  </figure>;
}
