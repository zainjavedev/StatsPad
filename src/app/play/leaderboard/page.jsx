import PredictorBoard from '../../../components/PredictorBoard';
import BlogShell from '../../../components/blog/BlogShell';

export const metadata = {
  title: 'NBA Predictor Leaderboard | StatsPads',
  description: 'Fans ranked on how many NBA winners they picked right before tip-off this season.',
  alternates: {canonical: '/play/leaderboard'},
  robots: {index: false},
};

export default function Page() {
  return <BlogShell active="/play/leaderboard" className="play" tabs><PredictorBoard/></BlogShell>;
}
