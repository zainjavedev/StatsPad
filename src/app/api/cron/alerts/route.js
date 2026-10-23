import { runAlerts } from '../../../../server/alerts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/* Hit every few minutes by .github/workflows/send-alerts.yml. */
export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', {status: 401});
  return Response.json(await runAlerts());
}
