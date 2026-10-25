import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { TEAMS, espnLogoUrl, nickname } from '../lib/teams';
import { useFeed } from '../lib/useFeed';
import { byRecord, loadStandings } from './StandingsPage';
import { navigate } from '../lib/nav';
import { useFavorites } from '../lib/favorites';

/* Small previews of the other pages, each ending in a link to the full thing. */

const Head = ({title, to, label, onClick}) => <div className="front-panel-head">
  <h2>{title}</h2>
  <button className="front-more" onClick={onClick ?? (() => navigate(to))}>{label} <ArrowRight size={14}/></button>
</div>;

const link = code => `/lineups/${TEAMS[code].name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const clock = new Intl.DateTimeFormat(undefined, {weekday: 'short', hour: 'numeric', minute: '2-digit'});
const pct = value => (Number(value) ? Number(value).toFixed(3).replace(/^0/, '') : '.000');

/* One table with East, West and League tabs: record, point difference, streak and each team's next game. Seeds 1-6 go
   straight to the playoffs, 7-10 to the play-in. */
export function StandingsPeek({games}) {
  const groups = useFeed(loadStandings), favorites = useFavorites();
  const [tab, setTab] = useState('eastern');
  const conferences = (groups ?? []).filter(group => /^(eastern|western)/i.test(group.name));
  const rows = useMemo(() => {
    if (tab === 'league') return conferences.flatMap(group => group.rows).sort(byRecord);
    return conferences.find(group => group.name.toLowerCase().startsWith(tab))?.rows ?? [];
  }, [conferences, tab]);
  const next = code => {
    const game = (games ?? []).find(item => item.state !== 'post' && (item.away.code === code || item.home.code === code));
    if (!game) return null;
    const away = game.away.code === code, other = away ? game.home : game.away;
    return {where: away ? '@' : 'vs', opp: other.abbr, when: game.state === 'in' ? 'Live' : clock.format(game.date)};
  };
  return <section className="front-panel peek pk">
    <Head title="Standings" to="/standings" label="Full standings"/>
    <div className="pk-tabs" role="group" aria-label="Standings view">
      {[['eastern', 'East'], ['western', 'West'], ['league', 'League']].map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}
    </div>
    {rows.length ? <div className="pk-table">
      <div className="pk-row pk-head"><span/><span>Team</span><span>W-L</span><span>PCT</span><span className="extra">GB</span><span className="extra">DIFF</span><span>STRK</span><span className="extra">NEXT</span></div>
      {rows.slice(0, 10).map((row, index) => {
        const upcoming = next(row.code), streak = String(row.stat.streak || '');
        return <React.Fragment key={row.code}>
          {tab !== 'league' && index === 6 && <div className="pk-cut" aria-hidden="true"><span>Play-in</span></div>}
          <a className={`pk-row${favorites.includes(row.code) ? ' mine' : ''}${tab !== 'league' && index < 6 ? ' in' : ''}`} href={link(row.code)}>
            <i>{index + 1}</i>
            <span className="pk-team"><img src={espnLogoUrl(row.code)} alt=""/><b>{nickname(row.code)}</b></span>
            <span>{row.stat.wins}-{row.stat.losses}</span>
            <span>{pct(row.stat.winPercent)}</span>
            <span className="extra">{row.stat.gamesBehind}</span>
            <span className="extra">{row.stat.differential && row.stat.differential !== '-' ? row.stat.differential : '–'}</span>
            <span className={streak.startsWith('W') ? 'up' : streak.startsWith('L') ? 'down' : ''}>{streak || '–'}</span>
            <span className="extra pk-next">{upcoming ? <>{upcoming.where} {upcoming.opp}<small>{upcoming.when}</small></> : '–'}</span>
          </a>
        </React.Fragment>;
      })}
    </div> : <div className="pk-table skeleton-block" style={{minHeight: 320}}/>}
  </section>;
}
