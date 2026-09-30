import { pageMeta } from '../../lib/meta';

export const metadata = pageMeta({ title: 'The holders lottery', description: 'One holder wins a share of the creator fees, every day. Hold, enter with your wallet, no gas.', path: '/lottery' });

export default function Layout({ children }) {
  return children;
}
