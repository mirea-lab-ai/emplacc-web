// segment layout for (main)
import '../globals.css';
import Providers from '@/app/providers';
import AuthGate from '@/components/AuthGate';
import Header from '@/components/Header';

const nav = [
  { label: 'Главная', href: '/' },
  { label: 'Мои проекты', href: '/projects'},
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
                <Header items={nav}/>
                {children}
            </div>
        </AuthGate>
    </Providers>
  );
}

