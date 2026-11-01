import BlogShell from '../../components/blog/BlogShell';
import AdminPage from '../../components/AdminPage';

export const metadata = {title: 'Activity | StatsPads', robots: {index: false, follow: false}, alternates: {canonical: '/admin'}};

export default function Page() {
  return <BlogShell active="" tabs><AdminPage/></BlogShell>;
}
