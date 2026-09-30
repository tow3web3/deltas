import { BRAND } from '../lib/brand';
import { HOME_DESCRIPTION } from '../lib/meta';

export default function manifest() {
  return {
    name: BRAND,
    short_name: BRAND,
    description: HOME_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    icons: [
      { src: '/brand/delta-256.png', sizes: '256x256', type: 'image/png' },
      { src: '/brand/delta-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
