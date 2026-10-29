/* Same-origin copy of a headshot or logo for the share cards. A picture made in the browser can only include images the page is allowed to
   read, and Safari often refuses ESPN's when it has the same picture cached from the page, so the card asks for it here instead. Only the
   image hosts the site already uses are allowed. */
const HOSTS = new Set(['a.espncdn.com', 'cdn.nba.com', 'a1.espncdn.com', 'a2.espncdn.com', 'a3.espncdn.com', 'a4.espncdn.com']);

export async function GET(request) {
  let target;
  try { target = new URL(new URL(request.url).searchParams.get('u') || ''); } catch { return new Response('Bad image address', {status: 400}); }
  if (target.protocol !== 'https:' || !HOSTS.has(target.hostname)) return new Response('Image host not allowed', {status: 400});
  const upstream = await fetch(target, {headers: {accept: 'image/*'}}).catch(() => null);
  const type = upstream?.headers.get('content-type') || '';
  if (!upstream?.ok || !type.startsWith('image/')) return new Response('Image not found', {status: 404});
  return new Response(upstream.body, {headers: {'content-type': type, 'cache-control': 'public, max-age=86400, s-maxage=604800, immutable'}});
}
