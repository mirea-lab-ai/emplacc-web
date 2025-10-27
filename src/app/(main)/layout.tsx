// segment layout for (main)
import '../globals.css';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Providers from "@/app/providers";
import AuthGate from "@/components/AuthGate";
const nav = [
  { label: 'Главная', href: '/' },
  { label: 'Проекты', href: '/projects' },
  { label: 'Команды', href: '/teams' },
  { label: 'Отчет', href: '/report' },
  { label: 'Форум', href: '/forum' },
  { label: 'Настройки профиля', href: '/settings' },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <AuthGate>
        <div className="mx-auto max-w-screen items-center p-6">
          <Header items={nav} />
          {children}
        </div>
      </AuthGate>
    </Providers>
  );
}
