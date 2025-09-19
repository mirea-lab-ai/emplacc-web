// app/layout.tsx
import '../globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Emplacc',
  description: 'Track tasks and time',
};
const admin_nav = [
  { label: 'Сотрудники', href: '/admin' },
  { label: 'Задачи', href: '/admin/tasks' },
  { label: 'Посещаемость и отчеты', href: '/admin/attendance' },
];

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
    <body className={`${inter.className} bg-[#0f1422] text-white`}>
    <div className="mx-auto max-w-6xl p-6">
      <Header items={admin_nav}/>
      {children}
    </div>
    </body>
    </html>
  );
}
