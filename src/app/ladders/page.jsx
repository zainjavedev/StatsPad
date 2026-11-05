import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import pages from '../../seo/pages.json';
import BlogShell from '../../components/blog/BlogShell';
import { seoMetadata } from '../../lib/seo-page';
import { TEAMS, espnLogoUrl } from '../../lib/teams';

export const metadata = seoMetadata('/ladders');

/* Every award race on one page, top five each, in the home page's ladder style: MVP and Rookie of the Year (with full ladders
   behind them), Sixth Man and Defensive Player of the Year. The races are built by scripts/prerender.mjs, so they are in the HTML. */
const photo = id => `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=260&h=190`;
const LABEL = {pts: 'pts', reb: 'reb', ast: 'ast', stl: 'stl', blk: 'blk'};
const one = value => Number(value ?? 0).toFixed(1).replace(/\.0$/, '');

function Race({race}) {
  return <section className="front-panel ladder" aria-label={race.name}>
    <div className="front-panel-head"><h2>{race.name}</h2>{race.href && <a className="front-more" href={race.href}>Full ladder <ArrowRight size={14}/></a>}</div>
    <p className="lds-method">{race.method}</p>
    <ol className="ld-list">{race.rows.map((row, index) => <li key={row.name} className={index < 3 ? 'top3' : undefined} style={{'--tc': TEAMS[row.team]?.color || '#8a8a8a'}}>
      <a className="ld-row ldc" href={row.url ?? '#'}>
        <b className="ld-rank">{index + 1}</b>
        <span className="rp-face">{row.espnId && <img src={photo(row.espnId)} alt="" loading="lazy"/>}{TEAMS[row.team] && <img className="rp-team" src={espnLogoUrl(row.team)} alt=""/>}</span>
        <span className="rp-main">
          <span className="rp-top"><b>{row.name}</b><small> · {row.team} · avg</small></span>
          <span className="rp-trio">{race.stats.map(key => <span key={key}><b>{one(row[key])}</b>{LABEL[key]}</span>)}</span>
        </span>
      </a>
    </li>)}</ol>
  </section>;
}

export default function Ladders() {
  const races = pages['/ladders']?.races;
  if (!races) notFound();
  return <BlogShell active="/ladders">
    <main className="lu-main lds">
      <h1>Award ladders</h1>
      <div className="ladder-pair">{races.slice(0, 2).map(race => <Race key={race.key} race={race}/>)}</div>
      <div className="ladder-pair">{races.slice(2).map(race => <Race key={race.key} race={race}/>)}</div>
    </main>
  </BlogShell>;
}
