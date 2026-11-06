'use client';
import React, { useEffect, useState } from 'react';
import { BlogGlyph, CompareGlyph, FixturesGlyph, GamesGlyph, HomeGlyph, LaddersGlyph, LeadersGlyph, PerformancesGlyph, PlusGlyph, StandingsGlyph, TeamsGlyph, TrophyGlyph } from './NavIcons';
import { useFavorites } from '../lib/favorites';
import { TEAMS, espnLogoUrl } from '../lib/teams';
import { gameUrl, teamUrl } from '../lib/routes';

/* The left menu on wide screens, on every page. Part of the page frame, not a card: flat, a line down its edge.
   Items are real links; inside the stats app `go` moves without a reload, on the server pages the link just loads.
   Labels from 1280px with tonight's games and the visitor's teams under the sections; icons alone from 900px.
   Phones keep the bottom tabs. */
const GROUPS = [
  [null, [['home', '/', 'Home', HomeGlyph], ['scores', '/fixtures', 'Fixtures', FixturesGlyph], ['performances', '/performances', 'Performances', PerformancesGlyph], ['leaders', '/leaders', 'Leaders', LeadersGlyph], ['ladders', '/ladders', 'Ladders', LaddersGlyph], ['standings', '/standings', 'Standings', StandingsGlyph]]],
  ['Explore', [['compare', '/compare', 'Compare', CompareGlyph], ['teams', '/lineups', 'Teams', TeamsGlyph], ['blog', '/blog', 'Blog', BlogGlyph]]],
  ['More', [['play', '/play', 'Games', GamesGlyph], ['leaderboard', '/play/leaderboard', 'Leaderboard', TrophyGlyph]]],
];

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const codeOf = abbr => Object.keys(TEAMS).find(code => TEAMS[code].espn === String(abbr).toLowerCase());
const clock = new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'});

/* Today's games from ESPN's scoreboard, refreshed every minute while one is live. */
function useTonight() {
  const [games, setGames] = useState([]);
  useEffect(() => {
    let timer;
    const check = () => fetch(SCOREBOARD, {cache: 'no-store'}).then(response => response.json()).then(board => {
      const list = (board.events ?? []).map(event => {
        const sides = event.competitions[0].competitors, side = where => sides.find(entry => entry.homeAway === where);
        const away = side('away'), home = side('home');
        return {id: event.id, state: event.status?.type?.state, detail: event.status?.type?.shortDetail, start: event.date,
          away: {code: codeOf(away.team.abbreviation), abbr: away.team.abbreviation, score: away.score}, home: {code: codeOf(home.team.abbreviation), abbr: home.team.abbreviation, score: home.score}};
      }).filter(game => game.away.code && game.home.code);
      setGames(list);
      if (list.some(game => game.state === 'in')) timer = setTimeout(check, 60e3);
    }).catch(() => {});
    check();
    return () => clearTimeout(timer);
  }, []);
  return games;
}

function Game({game}) {
  const live = game.state === 'in', post = game.state === 'post', shown = live || post;
  const status = live ? game.detail : post ? 'Final' : clock.format(new Date(game.start));
  return <a className={`side-game${live ? ' live' : ''}`} href={gameUrl(game.away.code, game.home.code, game.id)}>
    {[game.away, game.home].map((team, index) => <React.Fragment key={team.abbr}>{index === 1 && <span className="side-at">{shown ? '–' : '@'}</span>}<span className="side-game-team">
      <img src={espnLogoUrl(team.code)} alt=""/>{shown ? <em>{team.score}</em> : <b>{team.abbr}</b>}
    </span></React.Fragment>)}
    <small>{live && <i/>}{status}</small>
  </a>;
}

export default function SideNav({current, go}) {
  const favorites = useFavorites(), games = useTonight();
  const live = games.filter(game => game.state === 'in').length;
  const playing = new Set(games.filter(game => game.state === 'in').flatMap(game => [game.away.code, game.home.code]));
  return <aside className="side-nav" aria-label="Main">
    {GROUPS.map(([head, items]) => <nav key={head ?? 'main'} className="side-group" aria-label={head ?? 'Main'}>
      {head && <span className="side-head">{head}</span>}
      {items.map(([key, href, label, Icon]) => <a key={key} href={href} className={`side-link${current === key ? ' active' : ''}`} aria-current={current === key ? 'page' : undefined} title={label}
        onClick={go?.[key] ? event => { event.preventDefault(); go[key](); } : undefined}>
        <Icon size={20}/><span>{label}</span>
        {key === 'scores' && live > 0 && <em className="side-live">{live}</em>}
      </a>)}
    </nav>)}
    {games.length > 0 && <section className="side-group side-tonight" aria-label="Today's games">
      <span className="side-head">{live ? <><i className="side-pulse"/>Live now</> : 'Today'}</span>
      {[...games].sort((a, b) => (a.state === 'in' ? 0 : 1) - (b.state === 'in' ? 0 : 1)).slice(0, 5).map(game => <Game key={game.id} game={game}/>)}
      {games.length > 5 && <a className="side-link side-all" href="/fixtures">All {games.length} games</a>}
    </section>}
    <section className="side-group side-teams" aria-label="Your teams">
      <span className="side-head">Your teams</span>
      {favorites.map(code => <a key={code} className="side-link" href={teamUrl(code)} title={TEAMS[code].name}>
        <span className="side-logo"><img src={espnLogoUrl(code)} alt=""/>{playing.has(code) && <i className="side-dot" aria-label="Playing now"/>}</span><span>{TEAMS[code].name.split(' ').pop()}</span>
      </a>)}
      <a className="side-link side-add" href="/lineups" title="Follow teams"><PlusGlyph size={18}/><span>{favorites.length ? 'Add a team' : 'Follow teams'}</span></a>
    </section>
  </aside>;
}
