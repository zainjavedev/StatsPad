import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toBlob } from 'html-to-image';
import { Check, Copy, Download, Link2, MessageCircle, Share2, X as Close } from 'lucide-react';
import ShotChart from './ShotChart';
import { loadBoxscore } from '../lib/boxscore';
import { assistShotsOf, fgPct, fps, quarterStats, rating, shotsOf, tagsOf, total, tsPct } from '../lib/playerGame';
import { trio } from '../lib/trio';
import { siteHost, siteOrigin } from '../lib/share';

/* The photo maker behind the share icon on a performance card: a picture of the player's night (stats, quarter tabs,
   shot chart) with the ways to send it. The picture is the actual card on screen, captured at 1080 pixels wide. */

const day = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'}), shortDay = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'});
const num = value => Number(String(value ?? '').replace('+', '')) || 0;
const done = (made, tried) => `${made}/${tried}`;
const tone = grade => (grade >= 7.5 ? 'great' : grade >= 5.5 ? 'good' : grade >= 4 ? 'fair' : 'poor');

const Poster = forwardRef(function Poster({line, box, quarter, onQuarter}, ref) {
  const {player} = line, id = player.id;
  const {quarters} = useMemo(() => quarterStats(box.plays, id), [box, id]);
  const all = total(quarters), shown = quarter ? total(quarters, quarter) : all;
  const periods = [...quarters.keys()].sort((a, b) => a - b);
  const shots = useMemo(() => shotsOf(box.plays, id).filter(shot => !quarter || shot.q === quarter), [box, id, quarter]);
  const assists = useMemo(() => assistShotsOf(box.plays, id).filter(shot => !quarter || shot.q === quarter), [box, id, quarter]);
  const s = player.stats, grade = rating(s), tags = tagsOf(all, s.MIN);
  const own = line.team === box.away.abbr ? box.away : box.home, other = own === box.away ? box.home : box.away;
  const won = num(own.score) > num(other.score);
  const cell = (label, value) => <div key={label}><strong>{value}</strong><small>{label}</small></div>;
  const name = player.name.replace(/^(\S)\S*\s+/, '$1. ');
  return <div className="sp" ref={ref}>
    <div className="sp-cols">
      <div className="sp-left">
        <div className="sp-head">
          <span className="sp-face">{player.photo ? <img src={player.photo} alt="" crossOrigin="anonymous"/> : <i/>}<img className="sp-team" src={own.logo} alt="" crossOrigin="anonymous"/></span>
          <div className="sp-who">
            <p className="sp-name"><b>{name}</b><small> · {fps(all)} fps{line.date ? ` · ${shortDay.format(line.date)}` : ''}</small></p>
            <p className="sp-trio">{trio(s).map(([value, label]) => <span key={label}><b>{value}</b>{label}</span>)}</p>
            <p className="sp-score"><img src={own.logo} alt="" crossOrigin="anonymous"/><b className={won ? 'lead' : ''}>{own.score}</b>–<b className={won ? '' : 'lead'}>{other.score}</b><img src={other.logo} alt="" crossOrigin="anonymous"/></p>
          </div>
          <span className={`sp-grade ${tone(grade)}`}>{grade.toFixed(1)}</span>
        </div>
        {tags.length > 0 && <p className="sp-tags">{tags.map(tag => <span key={tag}>#{tag}</span>)}</p>}
        <p className="sp-pos">{player.pos || 'Player'} · {s.MIN} min</p>
        <div className="sp-grid">
          {!quarter && cell('MIN', s.MIN)}
          {cell('PTS', shown.PTS)}{cell('REB', shown.REB)}{cell('AST', shown.AST)}{cell('STL', shown.STL)}{cell('BLK', shown.BLK)}
          {!quarter && cell('+/-', s['+/-'])}
          {cell('FG', done(shown.FGM, shown.FGA))}{cell('3PT', done(shown.TPM, shown.TPA))}{cell('FT', done(shown.FTM, shown.FTA))}
          {cell('TO', shown.TO)}{cell('PF', shown.PF)}{cell('OREB', shown.OREB)}{cell('DREB', shown.DREB)}
          {cell('FG%', shown.FGA ? fgPct(shown).toFixed(1) : '–')}{cell('TS%', shown.FGA || shown.FTA ? tsPct(shown).toFixed(1) : '–')}{cell('FPS', fps(shown))}
        </div>
      </div>
      <div className="sp-side">
        <div className="sp-tabs" role="group" aria-label="Quarter">
          {[0, ...periods].map(period => <button type="button" key={period} className={quarter === period ? 'on' : ''} onClick={() => onQuarter(period)}>{period ? (period <= 4 ? `Q${period}` : `OT${period - 4}`) : 'All'}</button>)}
        </div>
        <div className="sp-court"><ShotChart shots={shots} assists={assists} className="sp-chart"/><small>{shots.filter(shot => shot.made).length}/{shots.length} from the field</small></div>
      </div>
    </div>
    <p className="sp-foot"><b>StatsPads</b><span>{line.date ? day.format(line.date) : ''} · {siteHost()}</span></p>
  </div>;
});

export default function PerfShare({line, onClose}) {
  const [box, setBox] = useState(null), [quarter, setQuarter] = useState(0), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const poster = useRef(null), frame = useRef(null), [scale, setScale] = useState(1), [posterHeight, setPosterHeight] = useState(0);
  const url = `${siteOrigin()}/games/${line.gameId}?player=${line.player.id}`;
  const text = `${line.player.name}: ${trio(line.player.stats).map(([value, label]) => `${value} ${label}`).join(', ')} (${line.team} ${line.score})`;

  useEffect(() => {
    let live = true;
    loadBoxscore(line.gameId).then(found => { if (live) setBox(found); }).catch(() => { if (live) setBox(false); });
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { live = false; window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [line.gameId, onClose]);

  /* The preview shrinks to fit the sheet so the buttons never scroll out of reach. The saved picture is not scaled. */
  useEffect(() => {
    if (!box || !poster.current || !frame.current) return undefined;
    const measure = () => {
      const card = poster.current, room = frame.current;
      if (!card || !room) return;
      setPosterHeight(card.offsetHeight);
      setScale(Math.min(1, (room.clientHeight - 8) / card.offsetHeight, (room.clientWidth - 4) / card.offsetWidth));
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(poster.current); watch.observe(frame.current);
    return () => watch.disconnect();
  }, [box]);

  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(''), 2400);
    return () => clearTimeout(timer);
  }, [note]);

  const blob = async () => {
    const node = poster.current;
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.race([Promise.all([...node.querySelectorAll('img')].filter(image => !image.complete).map(image => new Promise(resolve => { image.onload = resolve; image.onerror = resolve; }))), new Promise(resolve => setTimeout(resolve, 5000))]);
    const made = await toBlob(node, {pixelRatio: 1080 / node.offsetWidth, backgroundColor: '#000000', cacheBust: true});
    if (!made) throw new Error('no image');
    return made;
  };
  const file = async () => new File([await blob()], `${line.player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${line.gameId}.png`, {type: 'image/png'});
  const save = async picture => {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(picture); anchor.download = picture.name;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 10000);
  };
  const act = work => async () => {
    if (busy || !box) return;
    setBusy(true);
    try { setNote(await work()); } catch (error) { if (error?.name !== 'AbortError') setNote('Could not make the image'); }
    setBusy(false);
  };
  /* The phone's own share sheet when it takes files; otherwise the picture is saved. */
  const send = act(async () => {
    const picture = await file();
    if (navigator.canShare?.({files: [picture]})) { await navigator.share({files: [picture], title: line.player.name, text: `${text}\n${url}`}); return 'Shared'; }
    await save(picture); return 'Image saved';
  });
  const copy = act(async () => {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') { await save(await file()); return 'Copying images is not supported here, so it was saved'; }
    await navigator.clipboard.write([new ClipboardItem({'image/png': blob()})]);
    return 'Image copied';
  });
  const download = act(async () => { await save(await file()); return 'Image saved'; });
  const tweet = act(async () => {
    let copied = false;
    try { if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') { await navigator.clipboard.write([new ClipboardItem({'image/png': blob()})]); copied = true; } } catch { /* the post still opens */ }
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener');
    return copied ? 'Image copied, paste it into your post' : 'Save the image and attach it to your post';
  });
  const copyLink = async () => { try { await navigator.clipboard.writeText(url); setNote('Link copied'); } catch { setNote(url); } };
  const message = () => { window.location.href = `sms:?&body=${encodeURIComponent(`${text} ${url}`)}`; };

  return createPortal(<div className="ss-back" role="presentation" onClick={onClose}>
    <div className="ss-sheet" role="dialog" aria-modal="true" aria-label="Share image" onClick={event => event.stopPropagation()}>
      <div className="ss-top"><h3>Share image</h3><button type="button" className="ss-close" onClick={onClose} aria-label="Close"><Close size={18}/></button></div>
      <div className="ss-preview" ref={frame}>{box ? <div className="ss-scale" style={{transform: `scale(${scale})`, height: posterHeight ? posterHeight * scale : undefined}}><Poster ref={poster} line={line} box={box} quarter={quarter} onQuarter={setQuarter}/></div> : <div className="ss-wait">{box === false ? 'This game is not available yet.' : 'Building your image…'}</div>}</div>
      <div className="ss-actions">
        <button type="button" onClick={send} disabled={!box || busy}><i className="blue"><Share2 size={26}/></i>Share</button>
        <button type="button" onClick={copy} disabled={!box || busy}><i className="blue"><Copy size={26}/></i>Copy</button>
        <button type="button" onClick={download} disabled={!box || busy}><i className="blue"><Download size={26}/></i>Save</button>
      </div>
      <div className="ss-actions small">
        <button type="button" onClick={tweet} disabled={!box || busy}><i className="x"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></i>X</button>
        <button type="button" onClick={send} disabled={!box || busy}><i className="ig"><Share2 size={22}/></i>Instagram</button>
        <button type="button" onClick={copyLink}><i className="gray"><Link2 size={22}/></i>Copy link</button>
        <button type="button" onClick={message}><i className="gray"><MessageCircle size={22}/></i>Message</button>
      </div>
      {note && <div className="ss-note" role="status"><Check size={15}/>{note}</div>}
    </div>
  </div>, document.body);
}
