/* Resend over plain HTTP. MAIL_FROM stays on Resend's sandbox sender (which only
   delivers to the account owner) until statspads.com is verified there. */

export const siteUrl = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function sendMail({to, subject, html}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({from: process.env.MAIL_FROM || 'StatsPads <onboarding@resend.dev>', to, subject, html}),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
}

const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = body => `<div style="font:16px/1.5 system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#14140f">${body}</div>`;

export const confirmMail = token => ({
  subject: 'Confirm your StatsPads game alerts',
  html: wrap(`<h2>One click to turn on game alerts</h2><p>You asked StatsPads to email you when your favorite teams tip off and finish.</p><p><a href="${siteUrl()}/api/confirm?token=${token}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#14140f;color:#fff;text-decoration:none">Confirm email</a></p><p style="color:#666;font-size:13px">Didn't ask for this? Ignore this email and nothing will be sent.</p>`),
});

export const signinMail = code => ({
  subject: 'Your StatsPads sign-in link',
  html: wrap(`<h2>Sign in to StatsPads</h2><p>Open this link on the browser you want to use. It restores your followed teams and alerts and works once for the next 30 minutes.</p><p><a href="${siteUrl()}/api/session?code=${code}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#14140f;color:#fff;text-decoration:none">Sign in</a></p><p style="color:#666;font-size:13px">Didn't ask for this? Ignore this email.</p>`),
});

/* Tip-off alert: black masthead, the matchup with both logos, one button to the game page.
   Table layout and inline styles only, since mail clients ignore most CSS. */
const side = ({logo, name}) => `<td align="center" width="40%" style="padding:8px 0"><img src="${logo}" width="72" height="72" alt="" style="display:block;margin:0 auto 10px;border:0"><div style="font:700 15px/1.2 Arial,Helvetica,sans-serif;color:#14140f">${esc(name)}</div></td>`;

export const alertMail = ({title, body, token, matchup}) => {
  const unsubscribe = `<a href="${siteUrl()}/api/unsubscribe?token=${token}" style="color:#8a8a80">Unsubscribe</a>`;
  const card = matchup ? `
    <tr><td style="padding:34px 28px 8px" align="center">
      <div style="font:700 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8a8a80">Tips off in ${matchup.minutes} min</div>
    </td></tr>
    <tr><td style="padding:12px 20px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${side(matchup.away)}
      <td align="center" width="20%" style="font:700 12px Arial,Helvetica,sans-serif;letter-spacing:.1em;color:#8a8a80">AT</td>
      ${side(matchup.home)}
    </tr></table></td></tr>
    <tr><td style="padding:22px 28px 6px" align="center"><p style="margin:0;font:15px/1.5 Arial,Helvetica,sans-serif;color:#44443d">${esc(body)}</p></td></tr>
    <tr><td style="padding:20px 28px 34px" align="center"><a href="${matchup.url}" style="display:inline-block;padding:13px 26px;border-radius:999px;background:#14140f;color:#ffffff;font:700 14px Arial,Helvetica,sans-serif;text-decoration:none">Open the game</a></td></tr>` : `
    <tr><td style="padding:34px 28px" align="center"><h2 style="margin:0 0 10px;font:700 22px Arial,Helvetica,sans-serif;color:#14140f">${esc(title)}</h2><p style="margin:0;font:15px/1.5 Arial,Helvetica,sans-serif;color:#44443d">${esc(body)}</p></td></tr>`;
  return {
    subject: title,
    html: `<div style="margin:0;padding:24px 12px;background:#f1f0ea"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
    <tr><td style="padding:18px 28px;background:#14140f"><span style="font:700 16px Arial,Helvetica,sans-serif;letter-spacing:.04em;color:#ffffff">StatsPads</span></td></tr>${card}
    <tr><td style="padding:16px 28px;border-top:1px solid #ecebe4;font:12px/1.5 Arial,Helvetica,sans-serif;color:#8a8a80" align="center">You get this because you follow one of these teams. ${unsubscribe} from StatsPads alerts.</td></tr>
    </table></div>`,
  };
};
