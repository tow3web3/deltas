import { pageMeta } from '../../lib/meta';

export const metadata = pageMeta({ title: 'Dashboard', description: 'Draw where the fees of your coin go: holders, wallets, a buyback, a treasury, any page on the internet.', path: '/app', index: false });

export default function Layout({ children }) {
  return children;
}
