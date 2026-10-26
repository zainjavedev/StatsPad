import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';
import { photoUrl } from '../../../lib/photos';

/* The share image for a compare page: both players' photos, names and headline numbers, so a link to the
   comparison in Reddit or X carries the matchup instead of the generic site image. Built on request and cached. */
export const dynamic = 'force-dynamic';
export const alt = 'Side-by-side NBA stats comparison on StatsPads';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

const slugify = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fixed = value => (Number.isFinite(value) ? value.toFixed(1) : '–');

const rows = () => {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/data/2026-27/regular-season.json'), 'utf8')).players; } catch { return []; }
};

function Side({player, align}) {
  return <div style={{display: 'flex', flexDirection: 'column', alignItems: align, width: 500}}>
    {player.playerId ? <img src={photoUrl(player.playerId.replace(/^espn-/, ''))} width={350} height={254} style={{objectFit: 'cover', borderRadius: 24}}/> : <div style={{width: 350, height: 254, borderRadius: 24, background: '#1d1d20'}}/>}
    <div style={{marginTop: 22, fontSize: player.playerName.length > 18 ? 38 : 46, fontWeight: 800, color: '#fff', textAlign: align === 'flex-start' ? 'left' : 'right'}}>{player.playerName}</div>
    <div style={{marginTop: 8, display: 'flex', fontSize: 30, color: '#b9b9c0'}}>{fixed(player.stats.points)} PPG · {fixed(player.stats.totalRebounds)} RPG · {fixed(player.stats.assists)} APG</div>
  </div>;
}

export default function Image({params}) {
  const all = rows();
  const players = params.pair.split('-vs-').map(slug => all.find(p => slugify(p.playerName) === slug));
  if (players.length !== 2 || players.some(player => !player)) {
    return new ImageResponse(<div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0c', color: '#fff', fontSize: 64, fontWeight: 800}}>StatsPads · NBA comparisons</div>, size);
  }
  return new ImageResponse(<div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg,#0b0b0c,#17171b)', padding: '44px 60px', fontFamily: 'sans-serif'}}>
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#8e8f8a', fontSize: 28, fontWeight: 700}}><span>StatsPads</span><span>Who is better? 2026–27 stats</span></div>
    <div style={{display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', marginTop: 10}}>
      <Side player={players[0]} align="flex-start"/>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: 96, height: 96, borderRadius: 48, background: '#f4f3ef', color: '#0b0b0c', fontSize: 38, fontWeight: 900}}>VS</div>
      <Side player={players[1]} align="flex-end"/>
    </div>
  </div>, size);
}
