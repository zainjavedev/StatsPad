import BlogShell from '../../../components/blog/BlogShell';
import PostKit from '../../../components/PostKit';

export const metadata = {title: 'Post kit | StatsPads', robots: {index: false, follow: false}, alternates: {canonical: '/admin/postkit'}};

export default function Page() {
  return <BlogShell active="" tabs><PostKit/></BlogShell>;
}
