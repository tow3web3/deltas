import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import Legal from '../../components/Legal';
import { BRAND } from '../../lib/brand';
import { pageMeta } from '../../lib/meta';
import { PRIVACY, UPDATED } from '../../lib/legal';

export const metadata = pageMeta({
  title: 'Privacy policy',
  description: `What ${BRAND} reads when you connect a page, what it keeps, what it never touches, and how to have it erased.`,
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <Legal
          eyebrow="Privacy policy"
          title="What we read, and what we leave alone"
          intro={`${BRAND} needs to know that a page is yours before paying you. This is everything it reads to find out, and what happens to it after.`}
          updated={UPDATED}
          sections={PRIVACY}
          other={{ href: '/terms', label: 'Terms of service' }}
        />
      </main>
      <Footer />
    </>
  );
}
