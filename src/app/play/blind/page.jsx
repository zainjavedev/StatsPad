import BlindTest from '../../../components/BlindTest';
import BlogShell from '../../../components/blog/BlogShell';

export const metadata = {
  title: 'Blind Test: Pick the Better NBA Player | StatsPads',
  description: 'Two NBA players this season, names hidden. Pick the better one from the stats alone, then see who they were and how other fans voted.',
  alternates: {canonical: '/play/blind'},
  robots: {index: false},
};

export default function Page() {
  return <BlogShell active="/play" className="play" tabs><BlindTest/></BlogShell>;
}
