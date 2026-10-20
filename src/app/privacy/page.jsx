export const metadata = {title: 'Privacy Policy | StatsPads', description: 'What StatsPads stores about you and how to remove it.', alternates: {canonical: '/privacy'}};

const wrap = {maxWidth: 640, margin: '0 auto', padding: '48px 16px', font: '16px/1.6 system-ui, sans-serif'};

export default function Privacy() {
  return <main style={wrap}>
    <h1>Privacy Policy</h1>
    <p>StatsPads (statspads.com) is an NBA stats site. You can use it without an account. This page covers what we keep if you choose to sign in for game alerts.</p>
    <h2>What we store</h2>
    <ul>
      <li>Your email address, and your name only if you sign in with Google. From Google we receive just your email and whether it is verified.</li>
      <li>The teams you follow, so we know which alerts to send and can restore them on another browser.</li>
      <li>If you turn on browser notifications, the push subscription your browser gives us.</li>
      <li>Teams you follow without signing in stay in your own browser and are not sent to us.</li>
    </ul>
    <h2>How we use it</h2>
    <p>Only to email or notify you when a team you follow tips off or finishes, and to send sign-in links. We do not sell your data or show you ads based on it.</p>
    <h2>Who handles it</h2>
    <p>Neon (database), Resend (email), Vercel (hosting and analytics) and Google (sign-in) process data on our behalf.</p>
    <h2>Removing your data</h2>
    <p>Every alert email has an unsubscribe link. The Teams page also has a &quot;Delete my alerts&quot; button that removes your email and push subscriptions from our database.</p>
    <h2>Contact</h2>
    <p>Questions: zain.javed.965@gmail.com</p>
  </main>;
}
