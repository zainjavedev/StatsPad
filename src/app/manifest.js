export default function manifest() {
  return {
    name: 'StatsPads',
    short_name: 'StatsPads',
    description: 'NBA player and team comparisons, schedule, standings and league leaders.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b0c',
    theme_color: '#0b0b0c',
    icons: [
      {src: '/icon-192.png', sizes: '192x192', type: 'image/png'},
      {src: '/icon-512.png', sizes: '512x512', type: 'image/png'},
      {src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
    ],
  };
}
