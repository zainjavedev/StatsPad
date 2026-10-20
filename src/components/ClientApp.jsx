'use client';
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Analytics } from '@vercel/analytics/next';

/* The app reads location and history while it renders, so it only runs in the
   browser. The server sends the readable stats page instead (see SeoPage);
   once React is up that copy is hidden. */
const Boot = () => <div className="boot" aria-busy="true"><div className="boot-bar"/><div className="boot-body"><i/><i/><i/></div></div>;
const Home = dynamic(() => import('./Home'), {ssr: false, loading: Boot});

export default function ClientApp() {
  useEffect(() => { document.documentElement.classList.add('app-ready'); }, []);
  return <>
    <Home/>
    <Analytics/>
  </>;
}
