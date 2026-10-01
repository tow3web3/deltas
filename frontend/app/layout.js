import './globals.css'
import { Geist, Geist_Mono } from 'next/font/google'
import Backdrop from '../components/Backdrop'
import { BRAND, SITE_URL, X_URL, GITHUB_URL } from '../lib/brand'
import { pageMeta, HOME_DESCRIPTION } from '../lib/meta'

// Geist for everything that is read, Geist Mono for addresses and figures.
const sans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  metadataBase: new URL(SITE_URL),
  ...pageMeta(),
  applicationName: BRAND,
  keywords: ['DELTA', 'Robinhood Chain', 'creator fees', 'fee routing', 'memecoin dividends', 'stock tokens', 'buyback and burn', 'treasury', 'YouTube', 'GitHub'],
  category: 'finance',
  icons: {
    icon: [{ url: '/brand/delta-32.png?v=3', sizes: '32x32', type: 'image/png' }, { url: '/brand/delta-64.png?v=3', sizes: '64x64', type: 'image/png' }, { url: '/brand/delta-512.png?v=3', sizes: '512x512', type: 'image/png' }],
    shortcut: '/favicon.ico?v=3',
    apple: [{ url: '/brand/delta-256.png?v=3', sizes: '256x256', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: BRAND, statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false, address: false, email: false },
}

export const viewport = { themeColor: '#0A0A0A', colorScheme: 'dark', width: 'device-width', initialScale: 1 }

// What search engines read about the product, next to what people see.
const STRUCTURED = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: BRAND, url: SITE_URL, logo: `${SITE_URL}/brand/delta-512.png`, sameAs: [X_URL, GITHUB_URL].filter(Boolean) },
    { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, name: BRAND, url: SITE_URL, description: HOME_DESCRIPTION, publisher: { '@id': `${SITE_URL}/#org` } },
    { '@type': 'WebApplication', name: BRAND, url: `${SITE_URL}/app`, applicationCategory: 'FinanceApplication', operatingSystem: 'Web', description: HOME_DESCRIPTION, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className={sans.className}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED).replace(/</g, '\\u003c') }} />
        <Backdrop />
        {children}
      </body>
    </html>
  )
}
