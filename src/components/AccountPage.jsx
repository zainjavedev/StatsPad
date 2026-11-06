import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Camera, Eye, EyeOff, LogOut, ShieldCheck, Trash2, Trophy } from 'lucide-react';
import { useIsAdmin } from '../lib/admin';
import { useFavorites, toggleFavorite } from '../lib/favorites';
import { TEAMS } from '../lib/teams';
import { TeamLogo } from './TeamRail';
import { completeSignIn, disableAlerts, loadProfile, logIn, readAlerts, saveProfile, sendSignInLink, setPassword, signInWithGoogle, signOut, signUp, syncAlertTeams } from '../lib/alerts';

const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
/* A picked photo, cropped to a centred square and shrunk to a small JPEG (about 10 KB), so it can live on the account row. */
const squarePhoto = file => new Promise((resolve, reject) => {
  if (!file?.type?.startsWith('image/')) { reject(new Error('Pick an image file.')); return; }
  const image = new Image(), url = URL.createObjectURL(file);
  image.onload = () => {
    const side = Math.min(image.naturalWidth, image.naturalHeight), canvas = document.createElement('canvas');
    canvas.width = canvas.height = 192;
    canvas.getContext('2d').drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 192, 192);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL('image/jpeg', .85));
  };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be opened.')); };
  image.src = url;
});

/* Name and photo, shown on the predictor leaderboard. Nothing is public until it is saved here. */
function ProfileCard({googlePicture, onSaved}) {
  const [name, setName] = useState(''), [photo, setPhoto] = useState(null), [changed, setChanged] = useState(false), [busy, setBusy] = useState(false), [note, setNote] = useState(null);
  const file = useRef(null);
  useEffect(() => { loadProfile().then(data => { if (data) { setName(data.name); setPhoto(data.photo); } }); }, []);
  const choose = async event => {
    try { setPhoto(await squarePhoto(event.target.files?.[0])); setChanged(true); setNote(null); } catch (error) { setNote({ok: false, text: error.message}); }
    event.target.value = '';
  };
  const save = async event => {
    event.preventDefault(); setBusy(true); setNote(null);
    try {
      const data = await saveProfile(changed ? {name, photo} : {name});
      setName(data.name); setPhoto(data.photo); setChanged(false); onSaved?.(); setNote({ok: true, text: 'Saved. This is how you show up on the leaderboard.'});
    } catch (error) { setNote({ok: false, text: error.message}); }
    setBusy(false);
  };
  return <div className="acct-card acct-profile">
    <h2>Your profile</h2>
    <p className="acct-empty">Your name and photo on the <a href="/play/leaderboard">predictor leaderboard</a>.</p>
    <form onSubmit={save}>
      <div className="acct-photo-row">
        <span className="acct-photo">{photo ? <img src={photo} alt="" referrerPolicy="no-referrer"/> : <b>{name.trim()?.[0]?.toUpperCase() || '?'}</b>}</span>
        <div className="acct-photo-actions">
          <button type="button" className="acct-secondary" onClick={() => file.current?.click()}><Camera size={15}/> {photo ? 'Change photo' : 'Add a photo'}</button>
          {googlePicture && photo !== googlePicture && <button type="button" className="acct-link" onClick={() => { setPhoto(googlePicture); setChanged(true); }}>Use my Google photo</button>}
          {photo && <button type="button" className="acct-link" onClick={() => { setPhoto(null); setChanged(true); }}>Remove photo</button>}
        </div>
        <input ref={file} type="file" accept="image/*" hidden onChange={choose}/>
      </div>
      <label>Display name<input value={name} maxLength={24} onChange={event => setName(event.target.value)} placeholder="How other fans see you" autoComplete="nickname"/></label>
      <button className="acct-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
    </form>
    {note && <p className={`acct-note ${note.ok ? 'ok' : 'bad'}`} role="status">{note.text}</p>}
    <a className="acct-secondary acct-board" href="/play/leaderboard"><Trophy size={15}/> See the leaderboard</a>
  </div>;
}

const PERKS = [[ShieldCheck, 'Your teams everywhere', 'Sign in on any browser and your followed teams are already there.']];

/* Sign in, create an account, and manage it. Following a team never needs an account;
   syncing across devices does. */
export default function AccountPage({onTeams}) {
  const favorites = useFavorites();
  const [saved, setSaved] = useState(null), [mode, setMode] = useState('in'), [email, setEmail] = useState(''), [password, setPasswordText] = useState(''), [show, setShow] = useState(false);
  const [newPassword, setNewPassword] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState({});
  const googleButton = useRef(null), admin = useIsAdmin();
  const signedIn = Boolean(saved?.email);

  const run = async (area, task) => {
    setBusy(true); setNote({});
    try { setNote({[area]: {text: await task(), ok: true}}); } catch (error) { setNote({[area]: {text: error.message, ok: false}}); }
    setSaved(readAlerts()); setBusy(false);
  };
  const say = area => note[area] && <p className={`acct-note ${note[area].ok ? 'ok' : 'bad'}`} role="status">{note[area].text}</p>;

  useEffect(() => {
    setSaved(readAlerts());
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === '/signin' && readAlerts().email) window.history.replaceState(null, '', '/account');
    const code = params.get('signin');
    if (code) {
      window.history.replaceState(null, '', '/account');
      run('auth', async () => { await completeSignIn(code); return 'Signed in. Your teams are back. If you forgot your password, set a new one below.'; });
    }
  }, []);
  useEffect(() => { if (signedIn) syncAlertTeams(favorites); }, [favorites, signedIn]);
  useEffect(() => {
    if (!signedIn) return;
    let back = null;
    try { back = sessionStorage.getItem('statspad-return'); sessionStorage.removeItem('statspad-return'); } catch { /* private mode */ }
    if (back && back.startsWith('/')) window.location.href = back; else window.history.replaceState(null, '', '/account');
  }, [signedIn]);

  useEffect(() => {
    if (saved === null || signedIn || !GOOGLE_ID) return;
    const render = () => {
      window.google.accounts.id.initialize({client_id: GOOGLE_ID, callback: ({credential}) => run('auth', async () => { await signInWithGoogle(credential); return 'Signed in with Google.'; })});
      if (googleButton.current) window.google.accounts.id.renderButton(googleButton.current, {theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: Math.min(320, Math.max(200, (googleButton.current.clientWidth || 320) - 4))});
    };
    if (window.google?.accounts?.id) return render();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [saved, signedIn]);

  if (saved === null) return <section className="acct"><div className="acct-card"><p>Loading…</p></div></section>;

  if (!signedIn) return <section className="acct">
    <aside className="acct-side">
      <h1>{mode === 'up' ? 'Create your StatsPads account' : 'Welcome back'}</h1>
      <p>Follow teams with no account. Sign in to keep your teams on every device.</p>
      <ul>{PERKS.map(([Icon, title, text]) => <li key={title}><Icon size={20}/><div><b>{title}</b><span>{text}</span></div></li>)}</ul>
    </aside>
    <div className="acct-card">
      <div className="acct-tabs" role="tablist">
        {[['in', 'Sign in'], ['up', 'Create account']].map(([key, label]) => <button key={key} role="tab" aria-selected={mode === key} className={mode === key ? 'on' : ''} onClick={() => { setMode(key); setNote({}); }}>{label}</button>)}
      </div>
      {GOOGLE_ID && <div className="acct-google" ref={googleButton}/>}
      <div className="acct-divider"><span>or with email</span></div>
      <form onSubmit={event => { event.preventDefault(); run('auth', async () => {
        if (mode === 'up') { await signUp(email, password); return `Account created. Click the link we emailed to ${email} to finish setting up.`; }
        await logIn(email, password);
        return 'Signed in.';
      }); }}>
        <label>Email<input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@email.com" autoComplete="email"/></label>
        <label>Password
          <span className="acct-pass">
            <input type={show ? 'text' : 'password'} required minLength={mode === 'up' ? 8 : undefined} value={password} onChange={event => setPasswordText(event.target.value)} placeholder={mode === 'up' ? 'At least 8 characters' : 'Your password'} autoComplete={mode === 'up' ? 'new-password' : 'current-password'}/>
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </span>
        </label>
        {mode === 'in' && <button type="button" className="acct-link" disabled={busy || !email} onClick={() => run('auth', async () => { await sendSignInLink(email); return `If ${email} has an account, a sign-in link is on its way.`; })}>Forgot password? Email me a sign-in link</button>}
        <button className="acct-primary" disabled={busy}>{busy ? 'One moment…' : mode === 'up' ? 'Create account' : 'Sign in'}</button>
      </form>
      {say('auth')}
      <p className="acct-fine">By continuing you agree to our <a href="/privacy">privacy policy</a>.</p>
    </div>
  </section>;

  return <section className="acct acct-in">
    <div className="acct-head">
      <span className="acct-avatar">{saved.profilePhoto ? <img src={saved.profilePhoto} alt="" referrerPolicy="no-referrer"/> : saved.emailAddress?.[0]?.toUpperCase()}</span>
      <div><h1>Your account</h1><p>{saved.emailAddress}</p></div>
    </div>
    {say('auth')}
    <div className="acct-grid">
      <ProfileCard googlePicture={saved.picture} onSaved={() => setSaved(readAlerts())}/>
      {admin && <div className="acct-card">
        <h2>Activity</h2>
        <p className="acct-empty">Who visited, what they opened, where they came from, and Guess the Player rounds.</p>
        <a className="acct-secondary" href="/admin"><BarChart3 size={15}/> Open the dashboard</a>
      </div>}
      <div className="acct-card">
        <h2>Favorite teams</h2>
        {favorites.length
          ? <ul className="acct-teams">{favorites.map(code => <li key={code}><TeamLogo code={code} className="acct-logo"/><span>{TEAMS[code].name}</span><button onClick={() => toggleFavorite(code)} aria-label={`Remove ${TEAMS[code].name} from favorites`}>Remove</button></li>)}</ul>
          : <p className="acct-empty">No favorite teams yet.</p>}
        <button className="acct-secondary" onClick={onTeams}>{favorites.length ? 'Add more teams' : 'Pick your teams'}</button>
      </div>
      <div className="acct-card">
        <h2>Password</h2>
        <form onSubmit={event => { event.preventDefault(); run('password', async () => { await setPassword(newPassword); setNewPassword(''); return 'Password saved.'; }); }}>
          <label>Set or change password<input type="password" required minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password"/></label>
          <button className="acct-secondary" disabled={busy}>Save password</button>
        </form>
        {say('password')}
      </div>
      <div className="acct-card">
        <h2>Session</h2>
        <button className="acct-secondary" disabled={busy} onClick={() => { signOut(); setSaved(readAlerts()); window.history.replaceState(null, '', '/signin'); }}><LogOut size={15}/> Sign out on this browser</button>
        <button className="acct-danger" disabled={busy} onClick={() => { if (window.confirm('Delete your account? This cannot be undone.')) run('session', async () => { await disableAlerts('email'); window.history.replaceState(null, '', '/signin'); return 'Your account is deleted.'; }); }}><Trash2 size={15}/> Delete my account</button>
        {say('session')}
      </div>
    </div>
  </section>;
}
