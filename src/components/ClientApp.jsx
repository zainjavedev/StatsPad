'use client';
import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Analytics } from '@vercel/analytics/next';
import SiteHeader from './SiteHeader';
import { CompareSkeleton, HomeSkeleton, TeamLoading, skeletonForPath } from './Skeletons';
import { TEAMS } from '../lib/teams';
import { teamUrl } from '../lib/routes';

/* The app reads location and history while it renders, so it only runs in the
   browser. The server sends the readable stats page instead (see SeoPage);
   once React is up that copy is hidden.

   While the app's code downloads, this shows the same banner and the same
   placeholder the app itself shows while its data loads, picked from the route,
   so a page goes from one skeleton straight to its content. */
const idle = () => {};

function Boot({route}) {
  const teamCode = Object.keys(TEAMS).find(code => teamUrl(code) === route);
  const skeleton = route === '/' ? <HomeSkeleton/> : /^\/compare(\/|$)/.test(route) ? <CompareSkeleton/> : teamCode ? <TeamLoading teamCode={teamCode} color={TEAMS[teamCode].color} onPick={idle}/> : skeletonForPath(route);
  return <main aria-busy="true"><SiteHeader page={route === '/' ? 'home' : teamCode ? 'team' : ''} onHome={idle} onCompare={idle} onTeams={idle} onLeaders={idle} theme="dark" onToggleTheme={idle}/>{skeleton}</main>;
}

const Home = dynamic(() => import('./Home'), {ssr: false, loading: () => null});

export default function ClientApp({route = ''}) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => { document.documentElement.classList.add('app-ready'); }, []);
  /* data-nosnippet keeps the app's own labels ("Anthony EdwardsMIN · SG") out of Google's result snippet, so it uses the page description instead. */
  return <>
    <div data-nosnippet="" style={{display: 'contents'}}>
      {!ready && <Boot route={route}/>}
      <Home onReady={onReady}/>
    </div>
    <Analytics/>
  </>;
}
