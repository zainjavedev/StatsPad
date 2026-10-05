import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { NewsList } from './Feeds';
import { Markdown } from '../lib/markdown';
import { ARTICLES } from '../lib/articles';
import { latestNews, storyById } from '../lib/espn';
import { useFeed } from '../lib/useFeed';

/* News on StatsPad: our own articles, plus ESPN stories shown as headline,
   photo and summary with the players they mention. The full ESPN article is
   one click away on ESPN; we never copy its text. */

const fold = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '').replace(/[^a-z]/g, '');
const nickname = name => name.split(' ').pop().toLowerCase();
const longDate = new Intl.DateTimeFormat(undefined, {month: 'long', day: 'numeric', year: 'numeric'});
const ago = date => {
  const minutes = Math.round((Date.now() - date) / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return longDate.format(date);
};
const loadNewsIndex = () => latestNews(20);

/* Links inside our articles that point at the app (?team=PHI) navigate in
   place instead of reloading the page. */
const inAppLinks = onNavigate => event => {
  const link = event.target.closest('a');
  const href = link?.getAttribute('href');
  if (href?.startsWith('?') && !event.metaKey && !event.ctrlKey) { event.preventDefault(); onNavigate(href.slice(1)); }
};

function ArticleTeaser({article, onOpen, compact = false}) {
  return <a className={compact ? 'article-teaser compact' : 'article-teaser'} href={`?article=${article.slug}`} onClick={event => { event.preventDefault(); onOpen(article.slug); }}>
    <small>From StatsPad{article.date ? ` · ${longDate.format(article.date)}` : ''}</small>
    <b>{article.title}</b>
    {!compact && article.summary && <span>{article.summary}</span>}
  </a>;
}

export function FeaturedArticle({onOpen}) {
  return ARTICLES[0] ? <ArticleTeaser article={ARTICLES[0]} onOpen={onOpen} compact/> : null;
}

export function NewsIndex({onStory, onArticle}) {
  const stories = useFeed(loadNewsIndex);
  useEffect(() => { document.title = 'News · StatsPad'; }, []);
  return <section className="news-page">
    <h1>News</h1>
    {ARTICLES.length > 0 && <section className="news-section">
      <h2>From StatsPad</h2>
      <div className="article-grid">{ARTICLES.map(article => <ArticleTeaser key={article.slug} article={article} onOpen={onArticle}/>)}</div>
    </section>}
    <section className="news-section">
      <h2>Around the NBA</h2>
      <div className="front-panel"><NewsList articles={stories} onOpen={onStory}/></div>
    </section>
  </section>;
}

function PlayerChip({player, Art, playerIds, onOpen}) {
  return <button className="story-player" onClick={() => onOpen(player)}>
    <Art entity={player} playerIds={playerIds} className="story-player-art"/>
    <span>
      <b>{player.playerName}</b>
      <small>{player.currentTeam || player.team} · {player.stats.points.toFixed(1)} pts · {player.stats.totalRebounds.toFixed(1)} reb · {player.stats.assists.toFixed(1)} ast</small>
    </span>
  </button>;
}

export function StoryPage({id, players, teams, playerIds, Art, onOpen, onTeam, onStory, onBack, seasonLabel}) {
  const [story, setStory] = useState(undefined);
  const more = useFeed(loadNewsIndex);
  useEffect(() => {
    let active = true;
    setStory(undefined);
    storyById(id).then(result => active && setStory(result));
    return () => { active = false; };
  }, [id]);
  useEffect(() => { if (story) document.title = `${story.headline} · StatsPad`; }, [story]);
  const mentioned = useMemo(() => {
    if (!story) return {players: [], teams: []};
    const byName = new Map(players.map(player => [fold(player.playerName), player]));
    const byNick = new Map(teams.map(team => [nickname(team.playerName), team]));
    return {
      players: story.athletes.map(name => byName.get(fold(name))).filter(Boolean).slice(0, 4),
      teams: story.teams.map(name => byNick.get(nickname(name))).filter(Boolean),
    };
  }, [story, players, teams]);

  const back = <button className="back-button" onClick={onBack}><ArrowLeft size={16}/> News</button>;
  if (story === undefined) return <section className="news-page story-page">{back}<p className="feed-empty">Loading the story…</p></section>;
  if (!story) return <section className="news-page story-page">{back}<p className="feed-empty">This story isn&apos;t available anymore. <a href="https://www.espn.com/nba/" target="_blank" rel="noreferrer">See the latest NBA news on ESPN</a>.</p></section>;

  return <section className="news-page story-page">
    {back}
    <article>
      <small className="story-kicker">ESPN · {ago(story.published)}</small>
      <h1>{story.headline}</h1>
      {story.byline && <p className="story-byline">By {story.byline}</p>}
      {story.image && <img className="story-image" src={story.image} alt=""/>}
      {story.summary && <p className="story-summary">{story.summary}</p>}
      <a className="story-cta" href={story.url} target="_blank" rel="noreferrer">Read the full story on ESPN <ArrowUpRight size={16}/></a>
    </article>
    {(mentioned.players.length > 0 || mentioned.teams.length > 0) && <section className="news-section">
      <h2>In this story</h2>
      {mentioned.players.length > 0 && <div className="story-players">{mentioned.players.map(player => <PlayerChip key={player.playerId} player={player} Art={Art} playerIds={playerIds} onOpen={onOpen}/>)}</div>}
      {mentioned.teams.length > 0 && <div className="story-teams">{mentioned.teams.map(team => <button key={team.team} onClick={() => onTeam(team.team)}>
        <Art entity={team} playerIds={playerIds} className="story-team-logo"/>{team.playerName} roster
      </button>)}</div>}
      {mentioned.players.length > 0 && <p className="story-note">Player lines are {seasonLabel} per-game averages.</p>}
    </section>}
    <section className="news-section">
      <h2>More news</h2>
      <div className="front-panel"><NewsList articles={more && more.filter(item => item.id !== story.id).slice(0, 5)} onOpen={onStory}/></div>
    </section>
  </section>;
}

export function ArticlePage({slug, onBack, onNavigate}) {
  const article = ARTICLES.find(entry => entry.slug === slug);
  useEffect(() => { if (article) document.title = `${article.title} · StatsPad`; }, [article]);
  const back = <button className="back-button" onClick={onBack}><ArrowLeft size={16}/> News</button>;
  if (!article) return <section className="news-page story-page">{back}<p className="feed-empty">No article called “{slug}”.</p></section>;
  return <section className="news-page story-page">
    {back}
    <article className="article-body" onClick={inAppLinks(onNavigate)}>
      <small className="story-kicker">From StatsPad{article.date ? ` · ${longDate.format(article.date)}` : ''}</small>
      <h1>{article.title}</h1>
      <p className="story-byline">By {article.author}</p>
      {article.summary && <p className="story-summary">{article.summary}</p>}
      <Markdown source={article.body}/>
    </article>
  </section>;
}
