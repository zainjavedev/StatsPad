'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Gamepad2, Monitor, RefreshCw, Smartphone, Tablet, X } from 'lucide-react';
import { readAlerts } from '../lib/alerts';
import './admin.css';

/* The owner's activity dashboard: who visited, what they opened, and who plays Guess the Player.
   The server decides who gets in (src/server/activity.js); everyone else sees a not-found. */

const RANGES = [[1, '24h'], [7, '7 days'], [30, '30 days']];
const DEVICE = {phone: Smartphone, tablet: Tablet, desktop: Monitor};
const call = body => fetch('/api/admin', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token: readAlerts().email || '', ...body})})
  .then(response => response.status === 404 ? 'denied' : response.ok ? response.json() : Promise.reject(new Error(response.status)));

const ago = value => {
  const s = Math.max(0, (Date.now() - new Date(value)) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`;
};
const clock = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
const dayName = new Intl.DateTimeFormat(undefined, {weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC'});
const flag = code => code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt(0))) : '';
const who = person => person.email || `Guest · ${person.person.slice(0, 5)}`;

function Tile({label, value, note}) {
  return <div className="adm-tile"><span>{label}</span><b>{value}</b>{note && <small>{note}</small>}</div>;
}

function Daily({daily}) {
  const [hover, setHover] = useState(null);
  const top = Math.max(1, ...daily.map(d => d.visitors));
  const shown = hover ?? daily.length - 1;
  return <section className="adm-panel adm-daily">
    <div className="adm-hd"><h2>Visitors per day</h2><p>{daily[shown] && <>{dayName.format(new Date(daily[shown].day))}: <b>{daily[shown].visitors}</b> visitors, {daily[shown].views} views</>}</p></div>
    <div className="adm-bars" onMouseLeave={() => setHover(null)}>
      {daily.map((d, index) => <button key={d.day} type="button" className={index === shown ? 'on' : ''} onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} onClick={() => setHover(index)} aria-label={`${d.day}: ${d.visitors} visitors, ${d.views} views`}>
        <i style={{height: `${d.visitors ? Math.max(4, (d.visitors / top) * 100) : 0}%`}}/>
      </button>)}
    </div>
    <div className="adm-axis"><span>{daily[0] && dayName.format(new Date(daily[0].day))}</span><span>Today</span></div>
  </section>;
}

function Timeline({person, onClose}) {
  const [data, setData] = useState(null);
  useEffect(() => { setData(null); call({person: person.person}).then(setData).catch(() => setData({views: [], answers: []})); }, [person.person]);
  const items = data ? [...data.views.map(v => ({...v, kind: 'view'})), ...data.answers.map(a => ({...a, kind: 'play'}))].sort((a, b) => new Date(b.at) - new Date(a.at)) : [];
  return <div className="adm-sheet" role="dialog" aria-label={`Activity for ${who(person)}`} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="adm-sheet-card">
      <div className="adm-hd"><div><h2>{who(person)}</h2><p>{person.first_seen ? `${person.views} views · ${person.visits} visits · first seen ${ago(person.first_seen)}${person.referrer ? ` · came from ${person.referrer}` : ''}` : 'Pages and game rounds, newest first'}</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={18}/></button></div>
      {!data ? <p className="adm-muted">Loading…</p> : !items.length ? <p className="adm-muted">Nothing logged yet.</p>
        : <ol className="adm-timeline">{items.map((item, index) => <li key={index} className={item.kind}>
          <time>{clock.format(new Date(item.at))}</time>
          {item.kind === 'view' ? <span className="adm-path">{item.path}</span>
            : <span><Gamepad2 size={13}/> Round {item.step ?? '?'} · {item.player ?? 'a player'} · <b className={item.correct ? 'ok' : 'miss'}>{item.correct ? 'right' : 'wrong'}</b></span>}
        </li>)}</ol>}
    </div>
  </div>;
}

export default function AdminPage() {
  const [days, setDays] = useState(7), [hideMe, setHideMe] = useState(true);
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [open, setOpen] = useState(null);
  const load = useCallback(() => {
    setBusy(true); setError('');
    call({days, hideMe}).then(setData).catch(() => setError('Could not load the dashboard.')).finally(() => setBusy(false));
  }, [days, hideMe]);
  useEffect(() => { load(); }, [load]);

  if (data === 'denied') return <section className="adm adm-denied"><h1>Page not found</h1><p>There is nothing here.</p></section>;
  if (!data) return <section className="adm"><p className="adm-muted">{error || 'Loading…'}</p></section>;
  const {summary: s, daily, people, pages, referrers, players} = data;
  const range = RANGES.find(([value]) => value === days)[1];
  const topPage = Math.max(1, ...pages.map(p => p.views));

  return <section className="adm">
    <div className="adm-head">
      <div><h1>Activity</h1><p>{s.since ? `Logging since ${clock.format(new Date(s.since))}` : 'No visits logged yet. Logging starts once this is deployed.'}</p></div>
      <div className="adm-controls">
        <div className="adm-seg" role="group" aria-label="Time range">{RANGES.map(([value, label]) => <button key={value} type="button" className={value === days ? 'on' : ''} onClick={() => setDays(value)}>{label}</button>)}</div>
        <label className="adm-check"><input type="checkbox" checked={hideMe} onChange={event => setHideMe(event.target.checked)}/> Hide me</label>
        <button type="button" className="adm-icon" onClick={load} disabled={busy} aria-label="Refresh"><RefreshCw size={16} className={busy ? 'spin' : ''}/></button>
      </div>
    </div>

    <div className="adm-tiles">
      <Tile label="Visitors" value={s.visitors} note={`${s.visitors_day} in last 24h`}/>
      <Tile label="Page views" value={s.views} note={s.visitors ? `${(s.views / s.visitors).toFixed(1)} per visitor` : range}/>
      <Tile label="Signed in" value={s.members} note={`of ${s.accounts} accounts`}/>
      <Tile label="Games" value={s.games} note={`${s.finished} played to 10`}/>
      <Tile label="Rounds" value={s.answers} note={s.answers ? `${s.accuracy}% right` : range}/>
    </div>

    <Daily daily={daily}/>

    <section className="adm-panel">
      <div className="adm-hd"><h2>Latest visitors</h2><p>{range} · tap one for their trail</p></div>
      {!people.length ? <p className="adm-muted">No visitors in this range.</p> : <ul className="adm-people">{people.map(person => {
        const Icon = DEVICE[person.device] ?? Monitor;
        return <li key={person.person}><button type="button" onClick={() => setOpen(person)}>
          <span className={`adm-avatar ${person.email ? 'member' : ''}`}>{(person.email || '?')[0].toUpperCase()}</span>
          <span className="adm-who"><b>{who(person)}</b><span className="adm-path">{person.last_path}</span></span>
          <span className="adm-meta"><b>{ago(person.last_seen)}</b><span><Icon size={12}/> {flag(person.country)} {person.views} {person.views === 1 ? 'view' : 'views'}</span></span>
          <ChevronRight size={16} className="adm-chev"/>
        </button></li>;
      })}</ul>}
    </section>

    <div className="adm-split">
      <section className="adm-panel">
        <div className="adm-hd"><h2>Top pages</h2><p>{range}</p></div>
        {!pages.length ? <p className="adm-muted">No views yet.</p> : <ol className="adm-pages">{pages.map(page => <li key={page.path}>
          <i style={{width: `${(page.views / topPage) * 100}%`}}/><span className="adm-path">{page.path}</span><b>{page.views}</b><small>{page.visitors} ppl</small>
        </li>)}</ol>}
      </section>
      <section className="adm-panel">
        <div className="adm-hd"><h2>Where they came from</h2><p>{range} · first page only</p></div>
        {!referrers.length ? <p className="adm-muted">No outside referrers yet. Direct visits and app opens don&apos;t send one.</p>
          : <ol className="adm-pages">{referrers.map(ref => <li key={ref.source}><span className="adm-path">{ref.source}</span><b>{ref.visitors}</b><small>ppl</small></li>)}</ol>}
      </section>
    </div>

    <section className="adm-panel">
      <div className="adm-hd"><h2>Guess the Player</h2><p>Lifetime score per account. Games and rounds are logged from deploy on.</p></div>
      {!players.length ? <p className="adm-muted">Nobody has played yet.</p> : <div className="adm-table-wrap"><table className="adm-table">
        <thead><tr><th>Player</th><th>Rounds</th><th>Right</th><th>Best</th><th>Games</th><th>Last played</th></tr></thead>
        <tbody>{players.map(player => <tr key={player.person} onClick={() => setOpen({person: player.person, email: player.email})}>
          <td>{player.email}</td><td>{player.total}{player.recent ? <small> +{player.recent}</small> : null}</td>
          <td>{player.total ? Math.round((player.correct / player.total) * 100) : 0}%</td><td>{player.best}</td>
          <td>{player.games}{player.games ? <small> ({player.finished} done)</small> : null}</td><td>{ago(player.updated_at)}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>

    {open && <Timeline person={open} onClose={() => setOpen(null)}/>}
  </section>;
}
