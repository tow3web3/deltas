import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import Legal from '../../components/Legal';
import { BRAND } from '../../lib/brand';
import { pageMeta } from '../../lib/meta';
import { TERMS, UPDATED } from '../../lib/legal';

export const metadata = pageMeta({
  title: 'Terms of service',
  description: `The rules for creators who route fees with ${BRAND} and for the owners of the pages that receive them.`,
  path: '/terms',
});

export default function TermsPage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <Legal
          eyebrow="Terms of service"
          title="The rules, in plain words"
          intro={`What ${BRAND} does, what it asks of creators and page owners, and the risks that come with moving value on a blockchain.`}
          updated={UPDATED}
          sections={TERMS}
          other={{ href: '/privacy', label: 'Privacy policy' }}
        />
      </main>
      <Footer />
    </>
  );
}
