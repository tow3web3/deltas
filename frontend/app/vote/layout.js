import { pageMeta } from '../../lib/meta';

export const metadata = pageMeta({ title: 'Vote on the next payout', description: 'Holders of a coin choose the asset of its next payout. Weighted by balance and holding time, gasless, one signature.', path: '/vote' });

export default function Layout({ children }) {
  return children;
}
