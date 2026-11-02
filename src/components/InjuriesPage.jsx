import React, { useEffect, useMemo, useState } from 'react';
import { REFRESH, TIERS, loadInjuries, loadStatLines } from '../lib/injuries';
import { TierIcon } from './InjuryMark';
import { useFaceSize } from './RecentPerformances';
import { InjuryRowsSkeleton } from './Skeletons';
import { TEAMS, espnLogoUrl, nickname } from '../lib/teams';
import { TeamLogo } from './TeamRail';
import { favoritesFirst, useFavorites } from '../lib/favorites';

/* Everyone on the league's injury report, a bandage for the small ones, a first aid box for the
   real absences, an ambulance for the season-enders, each with a mini card of what they average. */

/* Plain filters on ESPN's own status; the icon on each card is only a marker. */
const FILTERS = [['all', 'All', () => true], ['dtd', 'Day-to-day', item => item.status === 'Day-To-Day'], ['out', 'Out', item => item.status !== 'Day-To-Day' && item.tier !== 'season'], ['season', 'Season', item => item.tier === 'season']];


const when = date => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'});

/* The tag in ESPN's news line ("is questionable for Wednesday") says more than the bare status. */
const gameTag = item => {
  const tag = item.headline.match(/\b(probable|questionable|doubtful)\b/i)?.[1] ?? item.note.match(/listed as (probable|questionable|doubtful)/i)?.[1];
  return tag ? `${tag[0].toUpperCase()}${tag.slice(1).toLowerCase()}` : null;
};

export function back(item) {
  if (item.tier === 'season') return 'Out for the season';
  if (!item.returnDate) return 'No return date';
  if (item.status === 'Day-To-Day') return gameTag(item) || 'Day-to-day';
  return `Targeting ${when(item.returnDate)}`;
}

const short = name => name.replace(/^(\S)\S*\s+/, '$1. ');
export const area = item => (item.area ? item.area.replace(/\b[a-z]/g, letter => letter.toUpperCase()) : item.status) + (item.detail ? ` · ${item.detail.toLowerCase()}` : '');

/* Laid out like the recent-performance cards: face with team badge, big numbers, the injury where the score would be. */
export function Card({item, line, compact = false}) {
  const tier = TIERS.find(entry => entry.key === item.tier), [main, face] = useFaceSize();
  return <li className={`inj-row tier-${item.tier}`}>
    <a className="rp-card" style={face ? {'--face': `${face}px`} : undefined} href={`/players/${item.slug}`}>
      <span className="rp-face">{item.headshot ? <img src={item.headshot} alt="" loading="lazy"/> : <i/>}<img className="rp-team" src={espnLogoUrl(item.team)} alt={item.team}/></span>
      <span className="rp-main" ref={main}>
        <span className="rp-top"><b>{short(item.name)}</b><small> · {back(item)}</small></span>
        {!compact && (line ? <span className="rp-trio"><span><b>{line.points.toFixed(1)}</b>pts</span><span><b>{line.rebounds.toFixed(1)}</b>reb</span><span><b>{line.assists.toFixed(1)}</b>ast</span></span> : <span className="rp-trio none">No NBA games on record</span>)}
        <small className="rp-game">{area(item)}{!compact && line ? ` · ${line.games} GP${line.season === '2026-27' ? '' : ' last season'}` : ''}</small>
      </span>
      <span className="inj-badge" title={tier.label} role="img" aria-label={tier.label}><TierIcon tier={item.tier} size={22}/></span>
    </a>
    {!compact && <p className="inj-news">{item.headline}</p>}
  </li>;
}

export default function InjuriesPage() {
  const favorites = useFavorites();
  const [items, setItems] = useState(null), [lines, setLines] = useState(new Map()), [tier, setTier] = useState('all'), [team, setTeam] = useState(''), [failed, setFailed] = useState(false);

  useEffect(() => {
    const load = () => loadInjuries().then(found => { setItems(found); setFailed(false); }).catch(() => setItems(previous => { if (!previous) setFailed(true); return previous ?? []; }));
    load();
    loadStatLines().then(setLines).catch(() => {});
    const timer = setInterval(load, REFRESH);
    return () => clearInterval(timer);
  }, []);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([key,, test]) => [key, (items ?? []).filter(test).length])), [items]);
  const strip = useMemo(() => {
    const test = FILTERS.find(([key]) => key === tier)[2], count = new Map();
    (items ?? []).filter(test).forEach(item => count.set(item.team, (count.get(item.team) ?? 0) + 1));
    return count;
  }, [items, tier]);
  const shown = useMemo(() => {
    if (!items) return null;
    const test = FILTERS.find(([key]) => key === tier)[2];
    return items.filter(item => test(item) && (!team || item.team === team))
      .sort((a, b) => (lines.get(b.slug)?.points ?? -1) - (lines.get(a.slug)?.points ?? -1) || a.name.localeCompare(b.name));
  }, [items, lines, tier, team]);

  const rail = strip.size > 1 && <nav className="team-rail" aria-label="Team">
    <h3>Teams</h3>
    <ul>
      <li><button className={!team ? 'active' : ''} onClick={() => setTeam('')}><span className="inj-rail-all">All</span><span>All teams</span><em className="inj-rail-count">{[...strip.values()].reduce((sum, n) => sum + n, 0)}</em></button></li>
      {favoritesFirst(favorites).filter(code => strip.has(code)).map(code => <li key={code} className={favorites.includes(code) ? 'fav' : ''}>
        <button className={team === code ? 'active' : ''} style={{'--team': TEAMS[code].color}} onClick={() => setTeam(team === code ? '' : code)} aria-pressed={team === code} title={TEAMS[code].name}>
          <TeamLogo code={code} className="team-rail-logo"/>
          <span>{nickname(code)}</span>
          <em className="inj-rail-count">{strip.get(code)}</em>
        </button>
      </li>)}
    </ul>
  </nav>;

  return <div className="team-shell inj-shell">
  {rail}
  <section className="inj">
    <div className="sched-head">
      <h1>NBA injury report</h1>
      <p>Who is out, who is day-to-day and who is done for the season, with what they average.</p>
    </div>
    <div className="sched-filters">
      <div className="inj-tabs" role="group" aria-label="Status">
        {FILTERS.map(([key, label]) => <button key={key} className={tier === key ? 'active' : ''} onClick={() => setTier(key)}>{label}{items && <i>{counts[key]}</i>}</button>)}
      </div>
    </div>

    {failed && <p className="inj-empty">Couldn&rsquo;t load the injury report.</p>}
    {shown && !failed && !shown.length && <p className="inj-empty">No injuries listed.</p>}
    <div className="inj-flat">{shown ? <ul className="rp-list inj-list">{shown.map(item => <Card key={item.id} item={item} line={lines.get(item.slug)}/>)}</ul> : <InjuryRowsSkeleton/>}</div>
    <p className="inj-source">ESPN injury report. Return dates are estimates.</p>
  </section>
  </div>;
}
