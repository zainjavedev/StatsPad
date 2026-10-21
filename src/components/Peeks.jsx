import React from 'react';
import { ArrowRight } from 'lucide-react';
import { TEAMS, espnLogoUrl, nickname } from '../lib/teams';
import { useFeed } from '../lib/useFeed';
import { loadStandings } from './StandingsPage';
import { navigate } from '../lib/nav';
import { useFavorites } from '../lib/favorites';

/* Small previews of the other pages, each ending in a link to the full thing. */

const Head = ({title, to, label, onClick}) => <div className="front-panel-head">
  <h2>{title}</h2>
  <button className="front-more" onClick={onClick ?? (() => navigate(to))}>{label} <ArrowRight size={14}/></button>
</div>;

const link = code => `/teams/${TEAMS[code].name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/* Seeds 1-6 go straight to the playoffs, 7-10 to the play-in. */
const Conference = ({group, favorites}) => <div className="peek-conf">
  <div className="peek-conf-head"><small>{group.name.replace(' Conference', '')}</small><span>W</span><span>L</span><span>PCT</span><span className="extra">GB</span><span className="extra">STRK</span></div>
  <ol>{group.rows.slice(0, 10).map((row, index) => <React.Fragment key={row.code}>
    {index === 6 && <li className="peek-cut" aria-hidden="true"><span>Play-in</span></li>}
    <li className={`${index < 6 ? 'in' : ''}${favorites.includes(row.code) ? ' mine' : ''}`}>
      <a href={link(row.code)}>
        <i>{index + 1}</i><img src={espnLogoUrl(row.code)} alt=""/><b>{nickname(row.code)}</b>
        <span>{row.stat.wins}</span><span>{row.stat.losses}</span><span>{Number(row.stat.winPercent) ? Number(row.stat.winPercent).toFixed(3).replace(/^0/, '') : '.000'}</span>
        <span className="extra">{row.stat.gamesBehind}</span>
        <span className={`extra${String(row.stat.streak).startsWith('W') ? ' up' : String(row.stat.streak).startsWith('L') ? ' down' : ''}`}>{row.stat.streak || '–'}</span>
      </a>
    </li>
  </React.Fragment>)}</ol>
</div>;

export function StandingsPeek() {
  const groups = useFeed(loadStandings), favorites = useFavorites();
  const conferences = (groups ?? []).filter(group => /^(eastern|western)/i.test(group.name));
  return <section className="front-panel peek">
    <Head title="Standings" to="/standings" label="Full standings"/>
    {conferences.length ? <div className="peek-standings">{conferences.map(group => <Conference key={group.name} group={group} favorites={favorites}/>)}</div> : <div className="peek-standings"><div className="peek-conf skeleton-block"/><div className="peek-conf skeleton-block"/></div>}
  </section>;
}
