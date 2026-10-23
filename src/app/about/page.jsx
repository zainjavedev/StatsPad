export const metadata = {title: 'About StatsPads | StatsPads', description: 'What StatsPads is, where its NBA numbers come from, how they are calculated and how often they update.', alternates: {canonical: '/about'}};

const wrap = {maxWidth: 680, margin: '0 auto', padding: '48px 16px 80px', font: '16px/1.65 system-ui, sans-serif'};

export default function About() {
  return <main style={wrap}>
    <h1>About StatsPads</h1>
    <p>StatsPads is a free NBA stats site built to show the whole league at a glance: side-by-side player and team comparisons on a skill radar, league leaders, standings, the schedule, team pages with the expected starting five, and game pages with box scores, shot charts and game flow.</p>

    <h2>Where the numbers come from</h2>
    <p>Current-season stats, schedules, box scores, rosters and news come from <a href="https://www.espn.com/nba/" target="_blank" rel="noreferrer">ESPN</a>&apos;s public feeds. Earlier seasons come from <a href="https://www.basketball-reference.com/" target="_blank" rel="noreferrer">Basketball Reference</a>. Player photos and a few team logos load from the NBA&apos;s public image CDN.</p>

    <h2>How it is calculated</h2>
    <ul>
      <li><strong>Per-game stats</strong> are the season averages as published by the source.</li>
      <li><strong>True shooting (TS%)</strong> is points divided by twice the shooting attempts, where attempts are field-goal attempts plus 0.44 of free-throw attempts.</li>
      <li><strong>Turnover rate (TOV%)</strong> is turnovers per 100 plays, where plays are field-goal attempts, 0.44 of free-throw attempts and turnovers.</li>
      <li><strong>League rankings</strong> compare a player against every qualified player, meaning at least one game played and ten minutes a game early in the season, and at least 15 games later on. Percentages need a minimum number of attempts.</li>
      <li><strong>Game score</strong> on the Top performances page is John Hollinger&apos;s box-score rating.</li>
      <li><strong>Expected starting five</strong> is the lineup a team has used most recently or most often, not an official announcement.</li>
    </ul>

    <h2>How often it updates</h2>
    <p>Stats, schedules and rosters are rebuilt automatically every few hours, and scores update live during games. The early weeks of a season have very few games, so averages swing a lot until teams have played more.</p>

    <h2>Editorial approach</h2>
    <p>The text on player, team and comparison pages is written by code from the numbers themselves, so it only states what the data shows. It describes who leads a category and where a player ranks; it does not predict results or give betting advice. If you spot a wrong number, tell us and we will check it against the source.</p>

    <p>StatsPads is an independent fan project and is not affiliated with the NBA or any of its teams. See the <a href="/privacy">privacy policy</a> and <a href="/terms">terms</a>, or <a href="/contact">get in touch</a>.</p>
  </main>;
}
