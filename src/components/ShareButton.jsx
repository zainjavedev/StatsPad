import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Share2 } from 'lucide-react';
import ShareCard from './ShareCard';
import { shareCard } from '../lib/share';
import { SITE } from '../lib/routes';

/* One button for every stat view. `spec` describes the card (see ShareCard);
   null disables the button. The card only exists in the page while it is
   being captured, off screen. */

const MESSAGES = {shared: 'Shared', saved: 'Image saved, link copied', failed: 'Could not make the image'};

export default function ShareButton({spec, filename, title, text, path, className = 'ghost-button', label = 'Share', compact = false}) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const card = useRef(null);

  useEffect(() => {
    if (!busy) return undefined;
    let live = true;
    (async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      let outcome;
      try { outcome = await shareCard(card.current, {filename, title, text, url: `${SITE}${path || ''}`}); } catch { outcome = 'failed'; }
      if (!live) return;
      setBusy(false);
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
    <button className={className} onClick={() => setBusy(true)} disabled={!spec || busy} title="Share this as an image" aria-label={compact ? label : undefined}>
      <Share2 size={15}/>{!compact && <> {busy ? 'Making image…' : label}</>}
    </button>
    {busy && spec && createPortal(<div className="sc-stage" aria-hidden="true"><ShareCard spec={{...spec, path: spec.path ?? path}} ref={card}/></div>, document.body)}
    {message && createPortal(<div className="toast" role="status"><Check size={16}/>{message}</div>, document.body)}
  </>;
}
