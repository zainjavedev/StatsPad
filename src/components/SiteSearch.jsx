'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { TEAMS, espnLogoUrl } from '../lib/teams';
import { playerUrl, slugify, teamUrl } from '../lib/routes';
import { navigate } from '../lib/nav';

/* The header search: players from this season's stats file and the 30 teams, loaded the first time the box is used.
   Name starts beat surname starts beat anywhere-in-the-name; ties go to the bigger scorer. "/" jumps to it.
   `spa` (the stats app) moves without a reload; the server pages load the page. */
const SEASON = '2026-27';
const face = id => `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=96&h=70`;
const fold = text => slugify(text).replaceAll('-', ' ');
let players;
const loadPlayers = () => (players ??= fetch(`/data/${SEASON}/regular-season.json`).then(response => response.json())
  .then(data => data.players.map(player => ({kind: 'player', name: player.playerName, team: player.team, id: (/^espn-(\d+)$/.exec(player.playerId) || [])[1], pts: player.stats?.points ?? 0, key: fold(player.playerName)})))
  .catch(() => []));
const TEAM_ROWS = Object.entries(TEAMS).map(([code, team]) => ({kind: 'team', code, name: team.name, key: fold(team.name)}));

function score(row, query) {
  if (row.key.startsWith(query)) return 3;
  if (row.key.split(' ').some(word => word.startsWith(query))) return 2;
  return row.key.includes(query) ? 1 : 0;
}

export default function SiteSearch({spa = false}) {
  const [query, setQuery] = useState(''), [list, setList] = useState([]), [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const box = useRef(null), input = useRef(null);
  const warm = () => loadPlayers().then(setList);

  useEffect(() => {
    const onKey = event => {
      if (event.key !== '/' || event.target.closest?.('input,textarea,[contenteditable]')) return;
      event.preventDefault(); input.current?.focus();
    };
    const onDown = event => { if (!box.current?.contains(event.target)) setOpen(false); };
    addEventListener('keydown', onKey); addEventListener('pointerdown', onDown);
    return () => { removeEventListener('keydown', onKey); removeEventListener('pointerdown', onDown); };
  }, []);

  const results = useMemo(() => {
    const wanted = fold(query);
    if (!wanted) return [];
    const rank = rows => rows.map(row => [score(row, wanted), row]).filter(([value]) => value);
    const teams = rank(TEAM_ROWS).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, row]) => row);
    const people = rank(list).sort((a, b) => b[0] - a[0] || b[1].pts - a[1].pts).slice(0, 8 - teams.length).map(([, row]) => row);
    return teams.length && teams.some(team => team.key.startsWith(wanted)) ? [...teams, ...people] : [...people, ...teams];
  }, [query, list]);

  const go = row => {
    setOpen(false); setQuery(''); input.current?.blur();
    const url = row.kind === 'team' ? teamUrl(row.code) : playerUrl(row.name);
    if (spa) navigate(url); else location.assign(url);
  };
  const onKeyDown = event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(now => (now + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % Math.max(1, results.length)); }
    else if (event.key === 'Enter' && results[active]) go(results[active]);
    else if (event.key === 'Escape') { setOpen(false); input.current?.blur(); }
  };

  return <div className="site-search" ref={box}>
    <label><Search size={16}/><input ref={input} type="search" value={query} placeholder="Search players or teams" aria-label="Search players or teams" autoComplete="off" spellCheck={false}
      role="combobox" aria-expanded={open && results.length > 0} aria-controls="site-search-list"
      onFocus={() => { warm(); setOpen(true); }} onChange={event => { warm(); setQuery(event.target.value); setActive(0); setOpen(true); }} onKeyDown={onKeyDown}/><kbd>/</kbd></label>
    {open && query && <ul id="site-search-list" role="listbox" className="site-search-list">
      {results.length ? results.map((row, index) => <li key={`${row.kind}-${row.code ?? row.id ?? row.name}`} role="option" aria-selected={index === active}>
        <button type="button" className={index === active ? 'active' : ''} onMouseEnter={() => setActive(index)} onClick={() => go(row)}>
          {row.kind === 'team' ? <span className="ss-logo"><img src={espnLogoUrl(row.code)} alt=""/></span> : <span className="ss-face" style={{'--tc': TEAMS[row.team]?.color || '#555'}}>{row.id && <img src={face(row.id)} alt="" loading="lazy"/>}</span>}
          <span className="ss-name"><b>{row.name}</b><small>{row.kind === 'team' ? 'Team' : `${row.team} · ${Number(row.pts).toFixed(1)} ppg`}</small></span>
        </button>
      </li>) : <li className="ss-none">No player or team called “{query}”</li>}
    </ul>}
  </div>;
}
