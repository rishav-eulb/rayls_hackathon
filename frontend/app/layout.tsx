/**
 * Root Layout
 * 
 * Global layout and styles
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexus Vault | Multi-Strategy Yield Vault',
  description: 'Earn optimized yields across multiple DeFi strategies with automated rebalancing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

