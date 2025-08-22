// app/layout.tsx
import '../globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TaskManager',
  description: 'Track tasks and time',
};

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
    <body className={`${inter.className} min-h-screen bg-[#0f1422] text-white`}>
    <div className="mx-auto max-w-6xl p-6">
      <Header />
      {children}
    </div>
    </body>
    </html>
  );
}
