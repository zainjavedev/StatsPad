/* Resend over plain HTTP. MAIL_FROM stays on Resend's sandbox sender (which only
   delivers to the account owner) until statspads.com is verified there. */

export const siteUrl = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function sendMail({to, subject, html}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({from: process.env.MAIL_FROM || 'StatsPad <onboarding@resend.dev>', to, subject, html}),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
}

const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = body => `<div style="font:16px/1.5 system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#14140f">${body}</div>`;

export const confirmMail = token => ({
  subject: 'Confirm your StatsPad game alerts',
  html: wrap(`<h2>One click to turn on game alerts</h2><p>You asked StatsPad to email you when your favorite teams tip off and finish.</p><p><a href="${siteUrl()}/api/confirm?token=${token}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#14140f;color:#fff;text-decoration:none">Confirm email</a></p><p style="color:#666;font-size:13px">Didn't ask for this? Ignore this email and nothing will be sent.</p>`),
});

export const alertMail = ({title, body, token}) => ({
  subject: title,
  html: wrap(`<h2>${esc(title)}</h2><p>${esc(body)}</p><p style="color:#666;font-size:13px"><a href="${siteUrl()}/api/unsubscribe?token=${token}">Unsubscribe</a> from StatsPad alerts.</p>`),
});
