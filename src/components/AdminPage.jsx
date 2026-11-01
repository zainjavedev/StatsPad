'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Gamepad2, Monitor, RefreshCw, Smartphone, Tablet, X } from 'lucide-react';
import { readAlerts } from '../lib/alerts';
import './admin.css';

/* The owner's activity dashboard: who visited, where they came from, what they opened, and who plays Guess the Player.
   The server decides who gets in (src/server/activity.js); everyone else sees a not-found. */

const RANGES = [[1, '24h'], [7, '7 days'], [30, '30 days']];
const DEVICE = {phone: Smartphone, tablet: Tablet, desktop: Monitor};
const KIND = {ai: 'AI answer', search: 'Search', social: 'Social', direct: 'Direct', other: 'Link'};
const ZONE = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; } })();
const call = body => fetch('/api/admin', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token: readAlerts().email || '', tz: ZONE, ...body})})
  .then(response => response.status === 404 ? 'denied' : response.ok ? response.json() : Promise.reject(new Error(response.status)));

const ago = value => {
  const s = Math.max(0, (Date.now() - new Date(value)) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`;
};
const isLive = value => Date.now() - new Date(value) < 5 * 60 * 1000;
const clock = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
const time = new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'});
const dayLong = new Intl.DateTimeFormat(undefined, {weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC'});
const dayShort = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', timeZone: 'UTC'});
const hourLabel = new Intl.DateTimeFormat(undefined, {hour: 'numeric', timeZone: 'UTC'});
const weekday = new Intl.DateTimeFormat(undefined, {weekday: 'short', timeZone: 'UTC'});
const regions = (() => { try { return new Intl.DisplayNames(['en'], {type: 'region'}); } catch { return null; } })();
const flag = code => code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt(0))) : '';
const country = code => (code && /^[A-Z]{2}$/.test(code) && regions?.of(code)) || 'Unknown';
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
/* The API's bucket labels are local wall-clock times already, so they're read as UTC to print them unshifted. */
const bucket = value => new Date(value.length === 10 ? `${value}T00:00:00Z` : `${value}:00Z`);
const who = person => person.email || `${flag(person.country)} ${person.device ?? 'desktop'} · ${person.source?.name ?? 'Direct'}`.trim();

/* No change is shown against an empty previous period: before logging began that just reads as "new". */
function Delta({now, before}) {
  if (!before) return null;
  const change = Math.round(((now - before) / before) * 100);
  return <em className={`adm-delta ${change > 0 ? 'up' : change < 0 ? 'down' : ''}`}>{change > 0 ? '+' : ''}{change}%</em>;
}

/* A tiny trend line under a tile's number, from the same series as the main chart. */
function Spark({values}) {
  if (values.length < 2 || !values.some(Boolean)) return null;
  const top = Math.max(...values), step = 100 / (values.length - 1);
  const points = values.map((value, index) => `${(index * step).toFixed(2)},${(28 - (value / top) * 24).toFixed(2)}`).join(' ');
  return <svg className="adm-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
    <polygon points={`0,30 ${points} 100,30`}/><polyline points={points}/>
  </svg>;
}

function Tile({label, value, note, children}) {
  return <div className="adm-tile"><span>{label}</span><b>{value}</b>{note && <small>{note}</small>}{children}</div>;
}

/* Visitors (or views) per bucket: hourly for 24h, daily otherwise. One axis, a few gridlines, the hovered bar's numbers in the header. */
function Traffic({series, days}) {
  const [metric, setMetric] = useState('visitors'), [hover, setHover] = useState(null);
  const values = series.map(row => row[metric]);
  const top = Math.max(1, ...values), nice = top <= 4 ? top : Math.ceil(top / 4) * 4;
  const shown = hover ?? series.length - 1, row = series[shown];
  const label = at => days === 1 ? hourLabel.format(bucket(at)) : (days > 7 ? dayShort : dayLong).format(bucket(at));
  const tick = at => (days === 1 ? hourLabel : days === 7 ? weekday : dayShort).format(bucket(at));
  const ticks = days === 1 ? [0, 6, 12, 18, 23] : days === 7 ? series.map((_, index) => index) : [0, 7, 14, 21, 29];
  const empty = !values.some(Boolean);
  return <section className="adm-panel adm-traffic">
    <div className="adm-hd">
      <div><h2>Traffic</h2><p>{row && <>{days === 1 ? `${label(row.at)} to ${hourLabel.format(new Date(bucket(row.at).getTime() + 3600e3))}` : dayLong.format(bucket(row.at))}: <b>{plural(row.visitors, 'visitor')}</b>, {plural(row.views, 'view')}</>}</p></div>
      <div className="adm-seg small" role="group" aria-label="Chart metric">{[['visitors', 'Visitors'], ['views', 'Views']].map(([key, text]) => <button key={key} type="button" className={metric === key ? 'on' : ''} onClick={() => setMetric(key)}>{text}</button>)}</div>
    </div>
    <div className="adm-plot">
      <div className="adm-grid" aria-hidden="true">{[nice, nice / 2, 0].map(value => <span key={value}><small>{Number.isInteger(value) ? value : value.toFixed(1)}</small></span>)}</div>
      <div className={`adm-bars${days === 30 ? ' dense' : ''}`} style={{gridTemplateColumns: `repeat(${series.length}, 1fr)`}} onMouseLeave={() => setHover(null)}>
        {series.map((entry, index) => <button key={entry.at} type="button" className={index === shown ? 'on' : ''} onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} onClick={() => setHover(index)} aria-label={`${label(entry.at)}: ${plural(entry.visitors, 'visitor')}, ${plural(entry.views, 'view')}`}>
          <i style={{height: `${entry[metric] ? Math.max(3, (entry[metric] / nice) * 100) : 0}%`}}/>
        </button>)}
      </div>
      {empty && <p className="adm-plot-empty">No {metric} in this range yet.</p>}
    </div>
    <div className="adm-axis" style={{gridTemplateColumns: `repeat(${series.length}, 1fr)`}}>
      {series.map((entry, index) => <span key={entry.at}>{ticks.includes(index) ? (index === series.length - 1 ? (days === 1 ? 'Now' : 'Today') : tick(entry.at)) : ''}</span>)}
    </div>
  </section>;
}

function Bars({rows, total, label, value, note, empty}) {
  if (!rows.length) return <p className="adm-muted">{empty}</p>;
  const top = Math.max(1, ...rows.map(value));
  return <ol className="adm-rows">{rows.map((row, index) => <li key={index}>
    <i style={{width: `${(value(row) / top) * 100}%`}}/>{label(row)}<b>{value(row)}</b><small>{note ? note(row) : total ? `${Math.round((value(row) / total) * 100)}%` : ''}</small>
  </li>)}</ol>;
}

function Sources({sources}) {
  const total = sources.reduce((sum, row) => sum + row.count, 0);
  return <section className="adm-panel">
    <div className="adm-hd"><h2>Where they came from</h2><p>first visit in range</p></div>
    <Bars rows={sources} total={total} empty="No visitors in this range."
      label={row => <span className="adm-src"><i className={`adm-kind ${row.kind}`}/>{row.name}{row.kind !== 'direct' && <small>{KIND[row.kind]}</small>}</span>} value={row => row.count}/>
  </section>;
}

function Audience({devices, countries}) {
  const total = devices.reduce((sum, row) => sum + row.count, 0);
  return <section className="adm-panel">
    <div className="adm-hd"><h2>Who they are</h2><p>{plural(total, 'visitor')}</p></div>
    {total ? <>
      <div className="adm-stack" role="img" aria-label={devices.map(row => `${row.name} ${row.count}`).join(', ')}>
        {devices.map(row => <i key={row.name} className={`dev-${row.name}`} style={{flexGrow: row.count}}/>)}
      </div>
      <ul className="adm-legend">{devices.map(row => { const Icon = DEVICE[row.name] ?? Monitor; return <li key={row.name}><i className={`dev-${row.name}`}/><Icon size={13}/> {row.name}<b>{Math.round((row.count / total) * 100)}%</b></li>; })}</ul>
      <Bars rows={countries} total={total} empty="" label={row => <span className="adm-src"><span aria-hidden="true">{flag(row.name)}</span>{country(row.name)}</span>} value={row => row.count}/>
    </> : <p className="adm-muted">No visitors in this range.</p>}
  </section>;
}

/* Views by hour of the day in the owner's timezone: when people actually show up. */
function Hours({hours}) {
  const top = Math.max(1, ...hours), peak = hours.indexOf(Math.max(...hours));
  const name = hour => hourLabel.format(new Date(Date.UTC(2026, 0, 1, hour)));
  return <section className="adm-panel">
    <div className="adm-hd"><h2>When they visit</h2><p>{hours.some(Boolean) ? <>busiest around <b>{name(peak)}</b>, your time</> : 'no views yet'}</p></div>
    <div className="adm-hours">{hours.map((views, hour) => <span key={hour} title={`${name(hour)}: ${plural(views, 'view')}`} className={hour === peak && views ? 'peak' : ''}><i style={{height: `${views ? Math.max(6, (views / top) * 100) : 0}%`}}/></span>)}</div>
    <div className="adm-hours-axis"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span></div>
  </section>;
}

function Pages({pages, entries}) {
  const [tab, setTab] = useState('top');
  const rows = tab === 'top' ? pages : entries;
  return <section className="adm-panel">
    <div className="adm-hd"><h2>Pages</h2><div className="adm-seg small" role="tablist">{[['top', 'Most viewed'], ['entry', 'Landing']].map(([key, text]) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{text}</button>)}</div></div>
    <Bars rows={rows} empty="No views yet." label={row => <a className="adm-path" href={row.path} target="_blank" rel="noreferrer">{row.path}</a>}
      value={row => tab === 'top' ? row.views : row.visitors} note={row => tab === 'top' ? `${row.visitors} ppl` : 'ppl'}/>
  </section>;
}

/* One person's trail, split into visits (30 minutes apart), newest first, with game rounds in between. */
function Timeline({person, onClose}) {
  const [data, setData] = useState(null);
  useEffect(() => { setData(null); call({person: person.person}).then(setData).catch(() => setData({views: [], answers: []})); }, [person.person]);
  useEffect(() => { const close = event => event.key === 'Escape' && onClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  const visits = useMemo(() => {
    if (!data || data === 'denied') return [];
    const items = [...data.views.map(v => ({...v, kind: 'view'})), ...data.answers.map(a => ({...a, kind: 'play'}))].sort((a, b) => new Date(a.at) - new Date(b.at));
    const groups = [];
    for (const item of items) {
      const last = groups.at(-1);
      if (!last || new Date(item.at) - new Date(last.items.at(-1).at) > 30 * 60 * 1000) groups.push({items: [item]}); else last.items.push(item);
    }
    return groups.map((group, index) => ({...group, number: index + 1, start: group.items[0], source: group.items.find(item => item.kind === 'view')?.source})).reverse().map(group => ({...group, items: [...group.items].reverse()}));
  }, [data]);
  return <div className="adm-sheet" role="dialog" aria-modal="true" aria-label={`Activity for ${who(person)}`} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="adm-sheet-card">
      <div className="adm-hd"><div><h2>{who(person)}</h2><p>{person.first_seen ? `${plural(person.views, 'view')} · ${plural(person.visits, 'visit')} · first seen ${ago(person.first_seen)}` : 'Pages and game rounds, newest first'}</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={18}/></button></div>
      {!data ? <p className="adm-muted">Loading…</p> : !visits.length ? <p className="adm-muted">Nothing logged yet.</p>
        : visits.map(visit => { const Icon = DEVICE[visit.start.device] ?? Monitor; return <section key={visit.number} className="adm-visit">
          <h3>Visit {visit.number}<span>{clock.format(new Date(visit.start.at))} · <Icon size={12}/> {flag(visit.start.country)}{visit.source ? ` · ${visit.source.name}` : ''}</span></h3>
          <ol className="adm-timeline">{visit.items.map((item, index) => <li key={index} className={item.kind}>
            <time>{time.format(new Date(item.at))}</time>
            {item.kind === 'view' ? <a className="adm-path" href={item.path} target="_blank" rel="noreferrer">{item.path}</a>
              : <span><Gamepad2 size={13}/> Round {item.step ?? '?'} · {item.player ?? 'a player'} · <b className={item.correct ? 'ok' : 'miss'}>{item.correct ? 'right' : 'wrong'}</b></span>}
          </li>)}</ol>
        </section>; })}
    </div>
  </div>;
}

const FILTERS = [['all', 'All'], ['members', 'Signed in'], ['guests', 'Guests'], ['live', 'Live']];

function People({people, onOpen}) {
  const [filter, setFilter] = useState('all');
  const shown = people.filter(person => filter === 'all' || (filter === 'members' ? person.email : filter === 'guests' ? !person.email : isLive(person.last_seen)));
  return <section className="adm-panel">
    <div className="adm-hd"><h2>Latest visitors</h2><div className="adm-seg small" role="group" aria-label="Filter visitors">{FILTERS.map(([key, text]) => <button key={key} type="button" className={filter === key ? 'on' : ''} onClick={() => setFilter(key)}>{text}</button>)}</div></div>
    {!shown.length ? <p className="adm-muted">{filter === 'live' ? 'Nobody on the site right now.' : 'No visitors here in this range.'}</p> : <ul className="adm-people">{shown.map(person => {
      const Icon = DEVICE[person.device] ?? Monitor;
      return <li key={person.person}><button type="button" onClick={() => onOpen(person)}>
        <span className={`adm-avatar ${person.email ? 'member' : ''}`}>{person.email ? person.email[0].toUpperCase() : flag(person.country) || <Icon size={15}/>}{isLive(person.last_seen) && <i className="adm-live-dot" aria-label="on the site now"/>}</span>
        <span className="adm-who"><b>{person.email || <>{country(person.country)} <small><Icon size={11}/> {person.device ?? 'desktop'}</small></>}</b><span className="adm-path">{person.last_path}</span></span>
        <span className="adm-meta"><b>{ago(person.last_seen)}</b><span><i className={`adm-kind ${person.source.kind}`}/>{person.source.name} · {plural(person.views, 'view')}</span></span>
        <ChevronRight size={16} className="adm-chev"/>
      </button></li>;
    })}</ul>}
  </section>;
}

export default function AdminPage() {
  const [days, setDays] = useState(7), [hideMe, setHideMe] = useState(true);
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [open, setOpen] = useState(null), [loadedAt, setLoadedAt] = useState(null);
  const load = useCallback(() => {
    setBusy(true); setError('');
    call({days, hideMe}).then(next => { setData(next); setLoadedAt(new Date()); }).catch(() => setError('Could not load the dashboard.')).finally(() => setBusy(false));
  }, [days, hideMe]);
  useEffect(() => { load(); }, [load]);
  /* Refresh every minute while the tab is in front, so "live" stays true. */
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60000);
    return () => clearInterval(timer);
  }, [load]);
  const closeSheet = useCallback(() => setOpen(null), []);

  if (data === 'denied') return <section className="adm adm-denied"><h1>Page not found</h1><p>There is nothing here.</p></section>;
  if (!data) return <section className="adm"><p className="adm-muted">{error || 'Loading…'}</p></section>;
  const {summary: s, series, people, pages, entries, sources, devices, countries, hours, players} = data;
  const range = RANGES.find(([value]) => value === days)[1];
  const ai = sources.filter(row => row.kind === 'ai').reduce((sum, row) => sum + row.count, 0);

  return <section className="adm">
    <div className="adm-head">
      <div>
        <h1>Activity</h1>
        <p><span className={`adm-live${s.live ? ' on' : ''}`}><i/>{s.live ? `${s.live} on the site now` : 'Nobody on right now'}</span> · {loadedAt ? `updated ${time.format(loadedAt)}` : ''}{s.since ? ` · logging since ${dayShort.format(new Date(s.since))}` : ''}</p>
      </div>
      <div className="adm-controls">
        <div className="adm-seg" role="group" aria-label="Time range">{RANGES.map(([value, label]) => <button key={value} type="button" className={value === days ? 'on' : ''} onClick={() => setDays(value)}>{label}</button>)}</div>
        <label className="adm-check"><input type="checkbox" checked={hideMe} onChange={event => setHideMe(event.target.checked)}/> Hide me</label>
        <button type="button" className="adm-icon" onClick={load} disabled={busy} aria-label="Refresh"><RefreshCw size={16} className={busy ? 'spin' : ''}/></button>
      </div>
    </div>
    {error && <p className="adm-error">{error}</p>}

    <div className="adm-tiles">
      <Tile label="Visitors" value={s.visitors} note={s.visitors_before ? <><Delta now={s.visitors} before={s.visitors_before}/> vs previous {range}</> : `${s.visitors_day ?? s.visitors} in the last 24h`}><Spark values={series.map(row => row.visitors)}/></Tile>
      <Tile label="Page views" value={s.views} note={<><Delta now={s.views} before={s.views_before}/> {s.visitors ? `${(s.views / s.visitors).toFixed(1)} per visitor` : range}</>}><Spark values={series.map(row => row.views)}/></Tile>
      <Tile label="From AI" value={ai} note={ai ? sources.filter(row => row.kind === 'ai').map(row => row.name).join(', ') : 'ChatGPT, Perplexity…'}/>
      <Tile label="Signed in" value={s.members} note={`of ${plural(s.accounts, 'account')}`}/>
      <Tile label="Game rounds" value={s.answers} note={s.answers ? `${plural(s.games, 'game')} · ${s.accuracy}% right` : 'Guess the Player'}/>
    </div>

    <Traffic series={series} days={days}/>

    <div className="adm-split">
      <div className="adm-stackcol">
        <People people={people} onOpen={setOpen}/>
        <Pages pages={pages} entries={entries}/>
      </div>
      <div className="adm-stackcol">
        <Sources sources={sources}/>
        <Audience devices={devices} countries={countries}/>
        <Hours hours={hours}/>
      </div>
    </div>

    <section className="adm-panel">
      <div className="adm-hd"><h2>Guess the Player</h2><p>lifetime score per account</p></div>
      {!players.length ? <p className="adm-muted">Nobody has played yet.</p> : <div className="adm-table-wrap"><table className="adm-table">
        <thead><tr><th>Player</th><th>Rounds</th><th>Right</th><th>Best</th><th>Games</th><th>Last played</th></tr></thead>
        <tbody>{players.map(player => <tr key={player.person} tabIndex={0} onClick={() => setOpen({person: player.person, email: player.email})} onKeyDown={event => event.key === 'Enter' && setOpen({person: player.person, email: player.email})}>
          <td>{player.email}</td><td data-label="Rounds">{player.total}{player.recent ? <small> +{player.recent}</small> : null}</td>
          <td data-label="Right">{player.total ? Math.round((player.correct / player.total) * 100) : 0}%</td><td data-label="Best">{player.best}</td>
          <td data-label="Games">{player.games}{player.games ? <small> ({player.finished} done)</small> : null}</td><td data-label="Played">{ago(player.updated_at)}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>

    {open && <Timeline person={open} onClose={closeSheet}/>}
  </section>;
}
