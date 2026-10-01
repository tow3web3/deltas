// A preview of the next look: glass and light around the logo, the routing
// drawn as channels of light. One page, nothing shared with the live site
// except the data it shows and the logo files.
import { Geist, Geist_Mono } from 'next/font/google';
import { Preview } from '../../components/preview/Preview';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata = { title: 'DELTA · preview', robots: { index: false, follow: false } };

export default function PreviewPage() {
  return (
    <div className={`${geist.variable} ${mono.variable}`} style={{ fontFamily: 'var(--font-geist), system-ui, sans-serif' }}>
      <Preview />
    </div>
  );
}
