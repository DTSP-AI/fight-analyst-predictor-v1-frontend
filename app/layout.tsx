import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import TopNav from './components/TopNav';
import LegalGate from './components/LegalGate';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'The Fight Analyst',
  description: 'AI-powered fight breakdown for coaches and fighters',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <LegalGate />
        <TopNav />
        {children}
      </body>
    </html>
  );
}
