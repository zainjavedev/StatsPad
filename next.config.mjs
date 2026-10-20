/** @type {import('next').NextConfig} */
export default {
  // The app reads location and history directly and was never wrapped in StrictMode.
  reactStrictMode: false,
  // The old Vercel address sends visitors and search engines to the real domain.
  async redirects() {
    return [{source: '/:path*', has: [{type: 'host', value: 'stats-pad.vercel.app'}], destination: 'https://statspads.com/:path*', permanent: true}];
  },
};
