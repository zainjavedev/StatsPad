import BlogShell from '../../../components/blog/BlogShell';
import StatsQuiz from '../../../components/StatsQuiz';

export const metadata = {
  title: 'NBA Stats Quiz | StatsPads',
  description: 'Ten questions about this NBA season: who leads the league, who had that game, whose numbers are whose. A new quiz every round.',
  alternates: {canonical: '/play/quiz'},
  robots: {index: false},
};

export default function Page() {
  return <BlogShell active="/play" className="play" tabs><StatsQuiz/></BlogShell>;
}
