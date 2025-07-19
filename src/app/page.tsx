'use client';

import dynamic from 'next/dynamic';

// Dynamically import the BitcoinGlobe component with no SSR
const BitcoinGlobe = dynamic(
  () => import('../components/BitcoinGlobe'),
  { ssr: false }
);

export default function Home() {
  return (
    <main style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden',
      background: 'black',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <BitcoinGlobe />
    </main>
  );
}
