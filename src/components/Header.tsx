'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { clearTokens, getRefreshToken, getUserId, isAuthed } from '@/lib/auth';
import { apiLogout } from '@/features/auth/api';
import { useEffect, useRef, useState } from 'react';
import { useUser } from '@/features/user/hooks';
import Avatar from '@/components/ui/Avatar';


type Props = {
  items: { label: string; href: string }[];
};

export default function Header({ items }: Props) {
    const router = useRouter();
    const userId = typeof window !== 'undefined' ? getUserId() : null;
    const [profileOpen, setProfileOpen] = useState(false);
    const hasCreds = isAuthed();
    const { data: user } = useUser(userId, hasCreds);
    const profileRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (!profileOpen) return;
      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
          setProfileOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, [profileOpen]);

  async function onLogout() {
    try {
      const rt = getRefreshToken();
      if (rt) await apiLogout(rt); // по спецификации
    } catch {
    }
        clearTokens();
        router.replace('/login');
    }

    const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href;

  return (
    <header className=" items-center mx-auto px-6 py-4 border-b border-gray-400 max-w-6xl ">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="На главную Emplacc"
        >
          <Logo className="h-10" variant="colored" priority />
          <span className="text-5xl font-semibold bg-gradient-to-r from-emerald-500 to-lime-400 bg-clip-text text-transparent">
            Emplacc
          </span>
        </Link>
        
        <nav className="flex gap-6 items-center">
          {items.map(({ label, href }) => {
            const active = isActive(href);
            if (href === '/settings' || label.toLowerCase().includes('настрой')) {
              return null;
            }
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'relative transition-colors',
                  active
                    ? 'text-white underline decoration-lime-400 decoration-2 underline-offset-8'
                    : 'text-slate-300 hover:text-white',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
          {hasCreds && user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10 hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <Avatar
                  name={`${user.firstName} ${user.lastName}`}
                  email={user.email}
                  size="md"
                />
                <span className="text-sm font-medium text-white">
                  {formatUserLabel(user)}
                </span>
                <svg
                  className={[
                    'h-4 w-4 text-slate-300 transition-transform',
                    profileOpen ? 'rotate-180' : '',
                  ].join(' ')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#091a14] p-2 ring-1 ring-emerald-400/30 shadow-lg z-50">
                  <Link
                    href="/settings"
                    className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10 transition"
                    onClick={() => setProfileOpen(false)}
                  >
                    Настройки
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); void onLogout(); }}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-red-200 hover:bg-red-500/10 transition"
                  >
                    Выход
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={onLogout} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 ring-1 ring-white/20">
              Выйти
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function formatUserLabel(user: { firstName: string; lastName: string }) {
  const firstInitial = user.firstName?.trim().charAt(0).toUpperCase() ?? '';
  const lastName = user.lastName?.trim() ?? '';
  if (!lastName && !firstInitial) {
    return 'Профиль';
  }
  return [lastName, firstInitial ? `${firstInitial}.` : ''].join(' ').trim();
}
