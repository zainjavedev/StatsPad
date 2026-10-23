export const metadata = {title: 'Contact StatsPads | StatsPads', description: 'Report a wrong stat, ask a question or request deletion of your data.', alternates: {canonical: '/contact'}};

const wrap = {maxWidth: 680, margin: '0 auto', padding: '48px 16px 80px', font: '16px/1.65 system-ui, sans-serif'};

export default function Contact() {
  return <main style={wrap}>
    <h1>Contact StatsPads</h1>
    <p>Email <a href="mailto:support@statspads.com">support@statspads.com</a> to report a wrong stat, ask a question, suggest a feature or ask us to delete your data.</p>
    <p>When you report a number, include the page link and what you expected to see. We check it against ESPN or Basketball Reference and fix it if the source agrees.</p>
    <p>More about the site is on the <a href="/about">about page</a>.</p>
  </main>;
}
