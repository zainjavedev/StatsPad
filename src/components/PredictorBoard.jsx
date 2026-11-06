'use client';
import React, { useEffect, useState } from 'react';
import { ArrowRight, User } from 'lucide-react';
import { TEAMS, espnLogoUrl } from '../lib/teams';
import { readAlerts } from '../lib/alerts';
import { useSignedIn, openSignIn } from '../lib/signin';
import { useFaceSize } from './RecentPerformances';
import { Move } from './LadderLive';
import GameHead from './GamesNav';

/* The predictor leaderboard (/play/leaderboard): everyone who picks winners on /fixtures, ranked on correct picks
   (/api/leaderboard), in the performance-card mould: rank, photo with the team they pick most as the badge, the record in
   big numbers, and the ladder's move since the last game day. The best three get colour cards, in that team's colour. */

const day = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'});
const pctOf = row => Math.round((row.won / Math.max(1, row.won + row.lost)) * 100);

function Row({row, top}) {
  const [main, face] = useFaceSize(true), [broken, setBroken] = useState(false);
  return <li className={`${top ? 'top3' : ''}${row.me ? ' pk-me' : ''}`} style={{'--tc': TEAMS[row.fav]?.color || '#8a8a8a'}}>
    <div className="rp-card has-rank pk-card" style={face ? {'--face': `${face}px`} : undefined}>
      <b className="ld-rank">{row.rank}</b>
      <span className="rp-face">{row.photo && !broken ? <img src={row.photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)}/> : <i className="pk-initial">{row.named ? row.name[0].toUpperCase() : <User size={18}/>}</i>}{TEAMS[row.fav] && <img className="rp-team" src={espnLogoUrl(row.fav)} alt="" title={`Picks ${TEAMS[row.fav].name} most`}/>}</span>
      <span className="rp-main" ref={main}>
        <span className="rp-top"><b>{row.name}</b><small> · {row.won + row.lost} {row.won + row.lost === 1 ? 'pick' : 'picks'}{row.me ? ' · you' : ''}</small></span>
        <span className="rp-trio"><span><b>{row.won}</b>right</span><span><b>{row.lost}</b>wrong</span><span><b>{pctOf(row)}%</b>hit</span></span>
      </span>
      <Move value={row.move}/>
    </div>
  </li>;
}

export default function PredictorBoard() {
  const auth = useSignedIn(), [data, setData] = useState(null);
  useEffect(() => {
    if (auth === 'checking') return undefined;
    let live = true;
    const token = auth === 'in' ? readAlerts().email : '';
    fetch(`/api/leaderboard${token ? `?token=${encodeURIComponent(token)}` : ''}`).then(response => (response.ok ? response.json() : {rows: []})).catch(() => ({rows: []}))
      .then(found => { if (live) setData(found); });
    return () => { live = false; };
  }, [auth]);
  const mine = data?.rows.find(row => row.me) ?? data?.me;

  return <main className="pk">
    <GameHead title="Predictor leaderboard"/>
    <p className="pk-lede">Pick who wins on <a href="/fixtures">Fixtures</a> before tip-off. Every correct pick counts; ties go to the better hit rate.{data?.through ? ` Through ${day.format(new Date(`${data.through}T12:00:00Z`))}, ${data.players} ${data.players === 1 ? 'fan' : 'fans'}.` : ''}</p>

    {auth === 'out' && <div className="gb-nudge pk-nudge"><p><b>Get on the board.</b> Sign in, make your picks, and you show up here after the games end.</p>
      <button type="button" className="gb-nudge-go" onClick={() => openSignIn({back: '/play/leaderboard', title: 'Join the leaderboard', line: 'One tap with Google. Pick winners on Fixtures and climb the board.'})}>Sign in</button></div>}
    {auth === 'in' && mine && !mine.named && <div className="gb-nudge pk-nudge"><p><b>You are {mine.name} right now.</b> Add your name and a photo so other fans know who is beating them.</p>
      <a className="gb-nudge-go" href="/account">Add name and photo</a></div>}

    {data === null ? <ul className="rp-list rp-ranked" aria-busy="true">{Array.from({length: 6}, (_, index) => <li key={index} className="pk-sk"/>)}</ul>
      : !data.rows.length ? <div className="pk-empty"><b>No picks graded yet.</b><p>The board fills in once the first picked games are final.</p><a className="qz-primary" href="/fixtures">Make your picks <ArrowRight size={17}/></a></div>
      : <>
        <ol className="rp-list rp-ranked pk-list list-in">{data.rows.map((row, index) => <Row key={`${row.rank}-${row.name}-${index}`} row={row} top={index < 3 && row.rank <= 3}/>)}</ol>
        {data.me && <><p className="pk-gap">Your place</p><ol className="rp-list rp-ranked pk-list"><Row row={data.me}/></ol></>}
        <p className="pk-foot"><a href="/fixtures">Make tonight’s picks <ArrowRight size={14}/></a></p>
      </>}
  </main>;
}
