// segment layout for /admin
import '../globals.css';
import type { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Emplacc',
  description: 'Track tasks and time',
};
const admin_nav = [
  { label: 'Сотрудники', href: '/admin' },
  { label: 'Задачи', href: '/admin/tasks' },
  { label: 'Посещаемость и отчеты', href: '/admin/attendance' },
];

export default function AdminLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl p-6 text-white">
      <Header items={admin_nav}/>
      {children}
    </div>
  );
}
