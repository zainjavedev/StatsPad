/* Browser side of game alerts. The subscription tokens live in localStorage and
   are what lets the favorites keep the server's team list up to date. */

const KEY = 'statspad-alerts';

export const readAlerts = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const writeAlerts = value => { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* private mode */ } };

const post = async (url, body, method = 'POST') => {
  const response = await fetch(url, {method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data;
};

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const keyBytes = base64 => {
  const padded = (base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
};

export const hasEmail = () => Boolean(readAlerts().email);

/* Alerts need an email: the bell asks for one (see EmailGate) before it follows a team. */
export const askForEmail = code => window.dispatchEvent(new CustomEvent('statspad:need-email', {detail: {code}}));

export async function enableBrowserAlerts(teams) {
  const emailToken = readAlerts().email;
  if (!emailToken) throw new Error('Add your email first.');
  if (await Notification.requestPermission() !== 'granted') throw new Error('Notifications are blocked for this site in your browser settings.');
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)});
  const {token} = await post('/api/subscribe', {channel: 'push', subscription: subscription.toJSON(), teams, emailToken});
  writeAlerts({...readAlerts(), push: token});
}

export async function enableEmailAlerts(email, teams) {
  const {token, confirmed} = await post('/api/subscribe', {channel: 'email', email, teams});
  writeAlerts({...readAlerts(), email: token, emailAddress: email});
  return confirmed;
}

export async function disableAlerts(channel) {
  if (channel === 'email') await disableAlerts('push');
  const saved = readAlerts();
  if (saved[channel]) await post('/api/unsubscribe', {token: saved[channel]}).catch(() => {});
  if (channel === 'push' && pushSupported()) {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    await (await registration?.pushManager.getSubscription())?.unsubscribe();
  }
  const rest = {...saved};
  delete rest[channel];
  if (channel === 'email') delete rest.emailAddress;
  writeAlerts(rest);
}

export async function syncAlertTeams(teams) {
  const saved = readAlerts();
  await Promise.all(['push', 'email'].filter(channel => saved[channel]).map(channel => post('/api/subscribe', {token: saved[channel], teams}, 'PUT').catch(() => {})));
}
