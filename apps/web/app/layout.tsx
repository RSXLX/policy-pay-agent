import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PolicyPay Agent',
  description: 'Policy-bound autonomous payment agent on Sui',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
