import '../style.css';

export const metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://stats-pad.vercel.app'),
  title: 'NBA Player Comparison',
  verification: {google: '5SfkNSf_uDFKP2wkBmwRzGWWYBhXAlEsb9AKDLzHVQc'},
};

export const viewport = {width: 'device-width', initialScale: 1};

const THEME = "try{document.documentElement.dataset.theme=localStorage.getItem('statspad-theme')||'light'}catch(e){document.documentElement.dataset.theme='light'}";
const GTM = "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-K7SXMQQ3');";

export default function RootLayout({children}) {
  return <html lang="en" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{__html: GTM}}/>
      <script dangerouslySetInnerHTML={{__html: THEME}}/>
    </head>
    <body>
      <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K7SXMQQ3" height="0" width="0" style={{display: 'none', visibility: 'hidden'}}/></noscript>
      {children}
    </body>
  </html>;
}
