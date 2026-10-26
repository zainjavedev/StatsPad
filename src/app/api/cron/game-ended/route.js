import { sql } from '../../../../server/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const day = offset => new Date(Date.now() - offset * 864e5).toLocaleDateString('en-CA', {timeZone: 'America/New_York'}).replaceAll('-', '');

/* Ping this every minute or two from a scheduler that is on time (GitHub's own cron runs hours late).
   When ESPN lists a finished game the database has not stored yet, it starts the "Refresh stats" workflow,
   so stats and box scores land minutes after the final buzzer instead of at the next scheduled run. */
export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', {status: 401});
  const boards = await Promise.all([0, 1].map(offset => fetch(`${SCOREBOARD}?dates=${day(offset)}`, {cache: 'no-store'}).then(r => r.json()).catch(() => null)));
  const finished = boards.flatMap(board => board?.events || []).filter(event => event.status?.type?.completed).map(event => String(event.id));
  if (!finished.length) return Response.json({finished: 0, missing: 0, started: false});
  const stored = new Set((await sql`select id from games where id = any(${finished})`).map(row => row.id));
  const missing = finished.filter(id => !stored.has(id));
  if (!missing.length) return Response.json({finished: finished.length, missing: 0, started: false});

  /* A run already started in the last 8 minutes is still catching up, so don't pile another on. */
  const headers = {Authorization: `Bearer ${process.env.GITHUB_DISPATCH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
  const workflow = `https://api.github.com/repos/${process.env.GITHUB_REPO || 'zainjavedev/StatsPad'}/actions/workflows/refresh-stats.yml`;
  const recent = await fetch(`${workflow}/runs?per_page=1`, {headers, cache: 'no-store'}).then(r => r.json()).catch(() => null);
  const last = recent?.workflow_runs?.[0];
  if (last && Date.now() - new Date(last.created_at) < 8 * 60e3) return Response.json({finished: finished.length, missing: missing.length, started: false, waiting: true});
  const reply = await fetch(`${workflow}/dispatches`, {method: 'POST', headers, body: JSON.stringify({ref: 'master'})});
  return Response.json({finished: finished.length, missing: missing.length, started: reply.status === 204, status: reply.status});
}
