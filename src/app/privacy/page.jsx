export const metadata = {title: 'Privacy Policy | StatsPads', description: 'What StatsPads collects, how it is used and how to remove it.', alternates: {canonical: '/privacy'}};

const wrap = {maxWidth: 680, margin: '0 auto', padding: '48px 16px 80px', font: '16px/1.65 system-ui, sans-serif'};

export default function Privacy() {
  return <main style={wrap}>
    <h1>Privacy Policy</h1>
    <p><em>Last updated: October 20, 2026</em></p>
    <p>StatsPads (&quot;we&quot;, &quot;us&quot;) runs statspads.com, a free NBA stats and player comparison site. You can browse, compare players and follow teams without an account. This policy explains what we collect if you do sign in, and what we collect from everyone.</p>

    <h2>Information we collect</h2>
    <ul>
      <li><strong>Account information.</strong> Your email address, and your name only if you sign in with Google. From Google we receive your email address and whether it is verified. We do not receive your Google password or access any other Google data.</li>
      <li><strong>Teams you follow.</strong> Stored with your account so we can send the right alerts and restore your teams on another browser. If you follow teams without signing in, they stay in your own browser and are not sent to us.</li>
      <li><strong>Notification data.</strong> If you turn on browser notifications, the push subscription your browser gives us.</li>
      <li><strong>Usage data.</strong> Standard web analytics (pages viewed, device type, approximate location) collected through Vercel Analytics and Google Tag Manager.</li>
    </ul>

    <h2>How we use it</h2>
    <ul>
      <li>To email or notify you when a team you follow tips off or finishes.</li>
      <li>To send sign-in and confirmation links.</li>
      <li>To understand how the site is used and improve it.</li>
    </ul>
    <p>We do not sell or rent your personal information, and we do not use it for advertising.</p>

    <h2>Cookies and local storage</h2>
    <p>We store your theme, followed teams and sign-in token in your browser&apos;s local storage. Analytics providers may set cookies. You can clear or block these in your browser settings.</p>

    <h2>Service providers</h2>
    <p>We share data only with providers that run the service for us: Vercel (hosting and analytics), Neon (database), Resend (email delivery), Google (sign-in and analytics) and ESPN and NBA public data feeds for scores and stats, which receive no personal information from us.</p>

    <h2>Retention and deletion</h2>
    <p>We keep your account data until you delete it. Every alert email has an unsubscribe link, and the Teams page has a &quot;Delete my alerts&quot; button; either removes your email, followed teams and push subscriptions from our database. You can also email us and we will delete it.</p>

    <h2>Children</h2>
    <p>StatsPads is not directed to children under 13 and we do not knowingly collect their information.</p>

    <h2>Changes</h2>
    <p>If we change this policy we will update the date above.</p>

    <h2>Contact</h2>
    <p>Questions or deletion requests: <a href="mailto:support@statspads.com">support@statspads.com</a></p>
  </main>;
}
