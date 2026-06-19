'use client';

import dynamic from 'next/dynamic';

const WalletApp = dynamic(() => import('./WalletApp').then((m) => m.WalletApp), {
  ssr: false,
  loading: () => (
    <main className="page">
      <div className="card">Loading wallet UI...</div>
    </main>
  ),
});

export function WalletAppClient() {
  return <WalletApp />;
}
