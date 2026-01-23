import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AgentationProvider } from '@/components/AgentationProvider';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Food Home',
  description: 'Food delivery application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <AgentationProvider>{children}</AgentationProvider>
      </body>
    </html>
  );
}


