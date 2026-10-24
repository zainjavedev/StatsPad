import '../style.css';
import { socialTags } from '../lib/social';

const TITLE = 'StatsPads: NBA player and team comparisons', DESCRIPTION = 'Compare NBA players and teams side by side, browse rosters and see the league leaders.';

export const metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://statspads.com'),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'StatsPads',
  ...socialTags({title: TITLE, description: DESCRIPTION}),
  verification: {google: 'uAikhNEtc4OO0e0Bg0WiwK_23KQh4t-MDsXrh49jbfw'},
};

export const viewport = {width: 'device-width', initialScale: 1, themeColor: '#0b0b0c'};

const THEME = "try{document.documentElement.dataset.theme=localStorage.getItem('statspad-theme')||'dark'}catch(e){document.documentElement.dataset.theme='dark'}";
const GTM = "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-K7SXMQQ3');";

export default function RootLayout({children}) {
  return <html lang="en" suppressHydrationWarning>
    <head>
      <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin=""/>
      <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt"/>
      <script dangerouslySetInnerHTML={{__html: GTM}}/>
      <script dangerouslySetInnerHTML={{__html: THEME}}/>
    </head>
    <body>
      <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K7SXMQQ3" height="0" width="0" style={{display: 'none', visibility: 'hidden'}}/></noscript>
      {children}
    </body>
  </html>;
}
