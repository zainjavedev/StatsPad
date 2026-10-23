import BlogShell from '../../components/blog/BlogShell';
import PlayGame from '../../components/PlayGame';

export const metadata = {
  title: 'Guess the Player | StatsPads',
  description: 'Name the NBA starter from a silhouette, a real stat line and a shot chart from this season. Three close choices, a running score and no end.',
  alternates: {canonical: '/play'},
  robots: {index: false},
};

export default function Page() {
  return <BlogShell active="/play" className="play"><PlayGame/></BlogShell>;
}
