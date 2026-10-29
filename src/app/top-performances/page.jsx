import BlogShell from '../../components/blog/BlogShell';
import PerformancesList from '../../components/PerformancesList';

export const metadata = {
  title: 'Best NBA performances from the last few nights | StatsPads',
  description: 'The standout individual lines from the latest NBA game nights: points, rebounds, assists and a grade for every big night.',
  alternates: {canonical: '/top-performances'},
};

/* The page behind "All performances" on the home page: the top lines of each recent night, newest night first. */
export default function Performances() {
  return <BlogShell active="/scores">
    <main className="lu-main perf-page">
      <h1>Best performances</h1>
      <p className="lu-lede">The standout lines from the last few game nights. Open one for the full night, shot chart and who he set up.</p>
      <PerformancesList/>
    </main>
  </BlogShell>;
}
