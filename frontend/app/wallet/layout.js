import { pageMeta } from '../../lib/meta';

export const metadata = pageMeta({ title: 'What a wallet was paid', description: 'The statement of a wallet: every payout it received from coins routing their fees, asset by asset.', path: '/wallet' });

export default function Layout({ children }) {
  return children;
}
