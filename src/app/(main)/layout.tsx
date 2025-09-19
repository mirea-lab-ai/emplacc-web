// app/layout.tsx
import '../globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Providers from "@/app/providers";
import AuthGate from "@/components/AuthGate";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Emplacc',
  description: 'Track tasks and time',
};
const nav = [
  { label: 'Главная', href: '/' },
  { label: 'Мои проекты', href: '/projects'},
  { label: 'Команды', href: '/teams' },
  { label: 'Отчет', href: '/report' },
  { label: 'Форум', href: '/forum' },
  { label: 'Настройки профиля', href: '/settings' },
];

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
    <body className={`${inter.className} bg-emerald-950 text-white`}>
    <Providers>
        <AuthGate>
            <div className="mx-auto max-w-screen items-center p-6">
                <Header items={nav}/>
                {children}
            </div>
        </AuthGate>
    </Providers>
    </body>
    </html>
  );
}
