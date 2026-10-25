import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Share2 } from 'lucide-react';
import ShareCard from './ShareCard';
import { shareCard, shareFile, siteOrigin } from '../lib/share';
import { withPhotos } from '../lib/photos';

/* One button for every stat view. `spec` describes the card (see ShareCard);
   null disables the button. The card only exists in the page while it is
   being captured, off screen. */

const MESSAGES = {shared: 'Shared', saved: 'Image saved, link copied', blocked: 'Image ready, tap Share again to save it', failed: 'Could not make the image'};

/* Waits until every picture inside the card has loaded or failed (a failed
   one swaps itself for initials), so the capture never catches a blank. */
const settled = async node => {
  const pending = [...node.querySelectorAll('img')].filter(image => !image.complete);
  await Promise.race([Promise.all(pending.map(image => new Promise(resolve => { image.onload = resolve; image.onerror = resolve; }))), new Promise(resolve => setTimeout(resolve, 6000))]);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
};

export default function ShareButton({spec, filename, title, text, path, className = 'ghost-button', label = 'Share', compact = false}) {
  const [busy, setBusy] = useState(false), [staged, setStaged] = useState(null), [message, setMessage] = useState('');
  const card = useRef(null), latest = useRef(spec), ready = useRef(null);
  latest.current = spec;
  /* iOS only opens the share sheet straight from a tap. If the picture took too long, it is kept and the next tap shares it at once. */
  const tap = async () => {
    if (!ready.current) { setBusy(true); return; }
    const file = ready.current;
    const outcome = await shareFile(file, {title, text, url: `${siteOrigin()}${path || ''}`});
    if (outcome !== 'blocked') ready.current = null;
    if (outcome !== 'cancelled') setMessage(MESSAGES[outcome]);
  };

  useEffect(() => {
    if (!busy) return undefined;
    let live = true;
    (async () => {
      let outcome;
      try {
        setStaged(await withPhotos(latest.current));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await settled(card.current);
        ready.current = null;
        outcome = await shareCard(card.current, {filename, title, text, url: `${siteOrigin()}${path || ''}`, onFile: file => { ready.current = file; }});
        if (outcome !== 'blocked') ready.current = null;
      } catch { outcome = 'failed'; }
      if (!live) return;
      setBusy(false); setStaged(null);
      if (outcome !== 'cancelled') setMessage(MESSAGES[outcome]);
    })();
    return () => { live = false; };
  }, [busy, filename, title, text, path]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(''), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  return <>
    <button className={className} onClick={tap} disabled={!spec || busy} title="Share this as an image" aria-label={compact ? label : undefined}>
      <Share2 size={15}/>{!compact && <> {busy ? 'Making image…' : label}</>}
    </button>
    {staged && createPortal(<div className="sc-stage" aria-hidden="true"><ShareCard spec={{...staged, path: staged.path ?? path}} ref={card}/></div>, document.body)}
    {message && createPortal(<div className="toast" role="status"><Check size={16}/>{message}</div>, document.body)}
  </>;
}
