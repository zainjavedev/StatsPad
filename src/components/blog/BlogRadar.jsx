'use client';
import React from 'react';
import Radar from '../Radar';

/* Radar keeps its hover tooltip in state, so it has to be a client component; the server still renders its SVG into the page. */
export default function BlogRadar({axes, names}) {
  return <Radar axes={axes} names={names} colors={['var(--ra)', 'var(--rb)']}/>;
}
