'use client';

import { TabKey } from '@/types';
import Link from "next/link";

const tabs: { href: TabKey; label: string }[] = [
    { href: '/', label: 'Главная'},
    { href: '/team', label: 'Команда' },
    { href: '/tasks', label: 'Задачи' },
    { href: '/reports', label: 'Отчёты' },
    { href: '/settings', label: 'Настройки' },
    { href: '/admin', label: 'Панель администратора'}
];

export default function Header({
                                   tab, onChange,
                               }: { tab: TabKey; onChange: (t: TabKey) => void }) {
    return (
        <header className="border-b border-slate-700/70 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
            <div className="mx-auto max-w-6xl px-4 py-4">
                <h1 className="text-center text-xl md:text-2xl font-semibold m-5 mb-10">
                    Единая Платформа Учёта и Развития Персонала
                </h1>
                <nav className="mt-4 flex gap-6 text-sm md:text-base justify-between">
                    {tabs.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => onChange(href)}
                            className={[
                                'px-2 pb-2 border-b-2 transition',
                                tab === href ? 'border-sky-400 text-sky-300'
                                    : 'border-transparent text-slate-300 hover:text-slate-100',
                            ].join(' ')}
                            aria-current={tab === href ? 'page' : undefined}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
}
