import React, { forwardRef } from 'react';
import ShareSheet from './ShareSheet';
import { espnLogoUrl, TEAMS, espnHeadshotUrl } from '../lib/teams';
import { siteOrigin } from '../lib/share';

/* A 16:9 picture for one player's story in the admin Post kit (a ladder move, a scoring streak, or two teammates' duo night):
   the shoulder-cut headshot (or two) on the left in the team's colour, a kicker, a big headline and a few numbers on the right.
   Saved at 1600x900 for X. */

const photo = id => espnHeadshotUrl(id);

const Poster = forwardRef(function Poster({story}, ref) {
  const {id, ids, name, team, kicker, big, headline, stats} = story;
  return <div className="st" ref={ref} style={{'--team': TEAMS[team]?.color || '#3b3b45'}}>
    <div className="st-body">
      <div className="st-art">
        {(ids ?? [id]).map(each => <img key={each} className={`st-face${ids ? ' is-pair' : ''}`} src={photo(each)} alt="" crossOrigin="anonymous"/>)}
        {TEAMS[team] && <img className="st-logo" src={espnLogoUrl(team)} alt="" crossOrigin="anonymous"/>}
      </div>
      <div className="st-copy">
        <span className="st-kicker">{kicker}</span>
        <b className="st-big">{big}</b>
        <span className="st-headline">{headline}</span>
        <span className="st-name">{name}</span>
        <span className="st-stats">{stats.map(([value, label]) => <span key={label}><b>{value}</b>{label}</span>)}</span>
      </div>
    </div>
    <p className="st-foot"><b>statspads.com</b><span>{TEAMS[team]?.name ?? ''}</span></p>
  </div>;
});

export default function StoryShare({story, onClose}) {
  return <ShareSheet width={1600} ready onClose={onClose} filename={story.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')} title={story.name} text={story.text} url={`${siteOrigin()}${story.path}`}>
    {ref => <Poster ref={ref} story={story}/>}
  </ShareSheet>;
}
