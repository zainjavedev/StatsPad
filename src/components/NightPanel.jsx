import React, { useEffect, useState } from 'react';
import ShareButton from './ShareButton';
import { bestOfNight, headline, lineCard, nightCard } from '../lib/performances';

/* The best individual lines from the latest finished games, each one shareable as a card. */
export default function NightPanel({results}) {
  const [lines, setLines] = useState(null);
  useEffect(() => {
    if (!results?.length) return undefined;
    let live = true;
    const latest = results[0].date.toDateString();
    bestOfNight(results.filter(game => game.date.toDateString() === latest), 5).then(found => { if (live) setLines(found); });
    return () => { live = false; };
  }, [results]);
  if (!lines?.length) return null;
  return <section className="front-panel night-panel">
    <div className="front-panel-head">
      <h2>Players of the night</h2>
      <ShareButton spec={nightCard(lines, lines[0].date)} filename="players-of-the-night" title="Players of the night" text="Players of the night on StatsPads" label="Share all"/>
    </div>
    <ol className="night-list">{lines.map((line, index) => <li key={line.player.id ?? line.player.name}>
      <span className="perf-rank">{index + 1}</span>
      {line.player.photo && <img className="night-face" src={line.player.photo} alt="" loading="lazy"/>}
      <span className="perf-name"><b>{line.player.name}</b><small>{line.team} {line.home ? 'vs' : '@'} {line.opp} · {line.won ? 'W' : 'L'} {line.score}</small></span>
      <strong>{headline(line)}</strong>
      <ShareButton spec={lineCard(line)} filename={`${line.player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-game`} title={line.player.name} text={`${line.player.name}: ${headline(line)}`} compact label="Share this line" className="ghost-button night-share"/>
    </li>)}</ol>
  </section>;
}
