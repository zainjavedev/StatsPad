import BlogShell from '../../components/blog/BlogShell';
import GamesHub from '../../components/GamesHub';

export const metadata = {
  title: 'NBA Games | StatsPads',
  description: 'NBA games built on this season\'s real stats: Guess the Player from a shot chart and a stat line, and a Stats Quiz that never asks the same question twice.',
  alternates: {canonical: '/play'},
  robots: {index: false},
};

export default function Page() {
  return <BlogShell active="/play" className="play" tabs><GamesHub/></BlogShell>;
}
