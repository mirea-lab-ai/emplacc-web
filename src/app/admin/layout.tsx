// segment layout for /admin
import '../globals.css';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Providers from '@/app/providers';
import AuthGate from '@/components/AuthGate';
import AdminGuard from '@/components/AdminGuard';

export const metadata: Metadata = {
  title: 'Emplacc',
  description: 'Track tasks and time',
};
const admin_nav = [
  { label: '📊 Дашборд',           href: '/admin' },
  { label: 'Сотрудники',           href: '/admin/users' },
  { label: 'Команды',              href: '/admin/teams' },
  { label: 'Проекты',              href: '/admin/projects' },
  { label: 'Доски',                href: '/admin/boards' },
  { label: 'Задачи',               href: '/admin/tasks' },
  { label: 'Конвейер',             href: '/admin/conveyor' },
  { label: 'Форум',                href: '/admin/forum' },
  { label: 'Посещаемость',         href: '/admin/attendance' },
  { label: 'Роли',                 href: '/admin/roles' },
  { label: '🔑 Токены',           href: '/admin/tokens' },
  { label: '🤖 LLM',              href: '/admin/llm' },
];

export default function AdminLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <AuthGate>
        <AdminGuard>
          <div className="flex h-full min-h-0 w-full flex-col gap-6 px-4 py-6 text-white sm:px-6 lg:px-10 overflow-hidden">
            <Header items={admin_nav}/>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">{children}</div>
          </div>
        </AdminGuard>
      </AuthGate>
    </Providers>
  );
}
