export const metadata = {title: 'Terms of Service | StatsPads', description: 'The terms for using statspads.com: acceptable use, data accuracy, accounts and liability.', alternates: {canonical: '/terms'}};

const wrap = {maxWidth: 680, margin: '0 auto', padding: '48px 16px 80px', font: '16px/1.65 system-ui, sans-serif'};

export default function Terms() {
  return <main style={wrap}>
    <h1>Terms of Service</h1>
    <p><em>Last updated: October 23, 2026</em></p>
    <p>By using statspads.com (&quot;StatsPads&quot;) you agree to these terms. If you do not agree, please do not use the site.</p>

    <h2>Using the site</h2>
    <p>StatsPads is free to browse, compare players and teams and follow teams. You may use it for personal, non-commercial purposes. Please do not scrape the site at a rate that affects other visitors, attempt to break or probe it, or use it to build a competing database.</p>

    <h2>Accounts</h2>
    <p>An account is optional and only syncs the teams you follow. You are responsible for keeping access to the email address you sign in with. You can delete your data at any time as described in the <a href="/privacy">privacy policy</a>.</p>

    <h2>Data accuracy</h2>
    <p>Statistics, schedules and scores come from third-party sources, mainly ESPN and Basketball Reference, and may be delayed, incomplete or wrong. They are provided as is, for information only. Do not rely on StatsPads for betting, fantasy or any decision where an error would cost you money.</p>

    <h2>Trademarks and content</h2>
    <p>StatsPads is an independent fan project. It is not affiliated with or endorsed by the NBA, ESPN or any team. Team names, logos and player names belong to their owners and appear only to identify the teams and players the statistics describe. The code and original text of StatsPads belong to its owner.</p>

    <h2>Availability and liability</h2>
    <p>We may change, pause or remove any part of the site at any time. To the extent the law allows, StatsPads is provided without warranties and we are not liable for any loss arising from your use of it.</p>

    <h2>Changes</h2>
    <p>If we change these terms we will update the date above. Continued use after a change means you accept it.</p>

    <h2>Contact</h2>
    <p>Questions: <a href="mailto:support@statspads.com">support@statspads.com</a></p>
  </main>;
}
