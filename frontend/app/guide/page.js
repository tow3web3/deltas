import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import Guide from '../../components/Guide';
import CTA from '../../components/CTA';
import { BRAND } from '../../lib/brand';
import { pageMeta } from '../../lib/meta';
import { GUIDE } from '../../lib/guide';

export const metadata = pageMeta({
  title: 'Guide',
  description: `How to route a coin's fees with ${BRAND}, from the dashboard or Telegram, how to route them to a page, and how the owner of a page claims them.`,
  path: '/guide',
});

export default function GuidePage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-6xl space-y-16 px-5 py-12">
        <Guide
          eyebrow="Guide"
          title="From a coin's fees to the people you choose"
          intro={`Setting up a coin, drawing its routing, sending a share to a page, and claiming a page that receives fees. Ten minutes to read, five to do.`}
          sections={GUIDE}
        />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
