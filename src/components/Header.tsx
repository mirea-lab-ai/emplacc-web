'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { label: 'Главная', href: '/' },
  { label: 'Отчет', href: '/report' },
  { label: 'Настройки профиля', href: '/settings' },
];

export default function Header() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <header className="rounded-2xl bg-[#111829]/80 px-6 py-4 ring-1 ring-white/5 backdrop-blur shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">TaskManager</div>

        <nav className="flex gap-10">
          {nav.map(({ label, href }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'relative transition-colors',
                  active
                    ? 'text-white underline decoration-[#3452ff] decoration-2 underline-offset-8'
                    : 'text-slate-300 hover:text-white',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
