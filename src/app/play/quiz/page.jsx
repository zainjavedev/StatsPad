import BlogShell from '../../../components/blog/BlogShell';
import StatsQuiz from '../../../components/StatsQuiz';

export const metadata = {
  title: 'NBA Stats Quiz | StatsPads',
  description: 'Ten questions about this NBA season: who leads the league, who leads each team, who wins the head to head. No question asked twice.',
  alternates: {canonical: '/play/quiz'},
  robots: {index: false},
};

export default function Page() {
  return <BlogShell active="/play" className="play" tabs><StatsQuiz/></BlogShell>;
}
