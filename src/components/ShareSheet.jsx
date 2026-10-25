import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toBlob } from 'html-to-image';
import { shareFontCSS } from '../lib/shareFont';
import { Check, Copy, Download, X as Close } from 'lucide-react';

/* The sheet behind every "share as an image" button: a preview of the picture (the actual card on screen,
   captured at 1080 pixels wide) and the ways to send it. `children` is a function that receives the ref to put on
   the card; `ready` says the card can be drawn, `failed` that its data never came. */


/* html-to-image drops some SVGs (the radar) from the picture, so each one is swapped for an image of itself with its
   computed styles written in, for the length of the capture. Returns the function that puts the SVGs back. */
const STYLE_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linejoin', 'stroke-linecap', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'paint-order', 'display'];
const bake = (source, width, height) => {
  const copy = source.cloneNode(true);
  const from = [source, ...source.querySelectorAll('*')], to = [copy, ...copy.querySelectorAll('*')];
  from.forEach((node, index) => {
    const computed = getComputedStyle(node);
    to[index].setAttribute('style', STYLE_PROPS.map(name => `${name}:${computed.getPropertyValue(name)}`).join(';'));
    to[index].removeAttribute('class');
  });
  copy.querySelectorAll('animate, animateMotion, animateTransform, title, .radar-comet').forEach(node => node.remove());
  copy.setAttribute('width', width); copy.setAttribute('height', height);
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
};
async function flattenSvgs(node) {
  const swaps = [], position = node.style.position;
  node.style.position = 'relative';
  for (const svg of node.querySelectorAll('.vs-radar svg')) {
    const box = svg.getBoundingClientRect(), scale = box.width / (svg.clientWidth || box.width) || 1;
    const width = svg.clientWidth || box.width / scale, height = svg.clientHeight || box.height / scale;
    const parent = svg.parentElement;
    const image = new Image();
    image.src = bake(svg, width, height);
    /* Laid exactly over the SVG (which stays in the page, hidden), so nothing moves while the picture is made. */
    image.style.cssText = `position:absolute;left:${(box.left - node.getBoundingClientRect().left) / scale}px;top:${(box.top - node.getBoundingClientRect().top) / scale}px;width:${width}px;height:${height}px;margin:0;max-width:none;pointer-events:none`;
    await new Promise(resolve => { image.onload = resolve; image.onerror = resolve; });
    parent.appendChild(image);
    svg.style.visibility = 'hidden';
    swaps.push([svg, image]);
  }
  return () => { swaps.forEach(([svg, image]) => { image.remove(); svg.style.visibility = ''; }); node.style.position = position; };
}

export default function ShareSheet({ready, failed, unavailable = 'This is not available yet.', onClose, filename, text, url, children}) {
  const [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const poster = useRef(null), frame = useRef(null), [scale, setScale] = useState(1), [posterHeight, setPosterHeight] = useState(0);

  useEffect(() => { shareFontCSS(); }, []);

  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  /* The preview shrinks to fit the sheet so the buttons never scroll out of reach. The saved picture is not scaled. */
  useEffect(() => {
    if (!ready || !poster.current || !frame.current) return undefined;
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
  }, [ready]);

  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(''), 2400);
    return () => clearTimeout(timer);
  }, [note]);

  const blob = async () => {
    const node = poster.current;
    const fontEmbedCSS = await shareFontCSS();
    if (fontEmbedCSS) await Promise.all([500, 600, 700, 800].map(weight => document.fonts.load(`${weight} 20px Inter`)));
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.race([Promise.all([...node.querySelectorAll('img')].filter(image => !image.complete).map(image => new Promise(resolve => { image.onload = resolve; image.onerror = resolve; }))), new Promise(resolve => setTimeout(resolve, 5000))]);
    const restore = await flattenSvgs(node);
    let made;
    try { made = await toBlob(node, {pixelRatio: 1080 / node.offsetWidth, backgroundColor: '#000000', cacheBust: true, ...(fontEmbedCSS ? {fontEmbedCSS} : {})}); } finally { restore(); }
    if (!made) throw new Error('no image');
    return made;
  };
  const file = async () => new File([await blob()], `${filename}.png`, {type: 'image/png'});
  const save = async picture => {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(picture); anchor.download = picture.name;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 10000);
  };
  const act = work => async () => {
    if (busy || !ready) return;
    setBusy(true);
    try { setNote(await work()); } catch (error) { if (error?.name !== 'AbortError') setNote('Could not make the image'); }
    setBusy(false);
  };
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

  return createPortal(<div className="ss-back" role="presentation" onClick={onClose}>
    <div className="ss-sheet" role="dialog" aria-modal="true" aria-label="Share image" onClick={event => event.stopPropagation()}>
      <div className="ss-top"><h3>Share image</h3><button type="button" className="ss-close" onClick={onClose} aria-label="Close"><Close size={18}/></button></div>
      <div className="ss-preview" ref={frame}>{ready ? <div className="ss-scale" style={{transform: `scale(${scale})`, height: posterHeight ? posterHeight * scale : undefined}}>{children(poster)}</div> : <div className="ss-wait">{failed ? unavailable : 'Building your image…'}</div>}</div>
      <div className="ss-actions">
        <button type="button" onClick={copy} disabled={!ready || busy}><i className="blue"><Copy size={26}/></i>Copy</button>
        <button type="button" onClick={download} disabled={!ready || busy}><i className="blue"><Download size={26}/></i>Save</button>
        <button type="button" onClick={tweet} disabled={!ready || busy}><i className="x"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></i>Post on X</button>
      </div>
      {note && <div className="ss-note" role="status"><Check size={15}/>{note}</div>}
    </div>
  </div>, document.body);
}
