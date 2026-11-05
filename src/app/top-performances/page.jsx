import BlogShell from '../../components/blog/BlogShell';
import PerformancesList from '../../components/PerformancesList';

export const metadata = {
  title: 'NBA player performances from the last few nights | StatsPads',
  description: 'Every player\'s line from the latest NBA game nights, sortable by points, rebounds, assists, steals, blocks, threes, FG% and more, with a grade for each night.',
  alternates: {canonical: '/top-performances'},
};

/* The page behind "All performances" on the home page: every line of the last few nights, sortable on any stat. */
export default function Performances() {
  return <BlogShell active="/top-performances">
    <main className="lu-main perf-page">
      <h1>Performances</h1>
      <PerformancesList/>
    </main>
  </BlogShell>;
}
