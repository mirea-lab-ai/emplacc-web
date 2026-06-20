'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import Avatar from '@/components/ui/Avatar';
import CommandPalette from '@/components/ui/CommandPalette';
import { clearTokens, getUserId, isAuthed } from '@/lib/auth';
import { http } from '@/lib/http';
import { useUser } from '@/features/user/hooks';
import { useUserRole } from '@/features/roles/hooks';

type Props = {
  items: { label: string; href: string }[];
};

const GUEST_BLOCKED_LABELS = ['РјРѕРё Р·Р°РґР°С‡Рё', 'РєРѕРјР°РЅРґС‹'];
const GUEST_BLOCKED_PATHS = ['/tasks', '/teams'];

export default function Header({ items }: Props) {
  const router = useRouter();
  const userId = typeof window !== 'undefined' ? getUserId() : null;
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const hasCreds = isAuthed();
  const { data: user } = useUser(userId, hasCreds);
  const { data: userRole } = useUserRole(userId, hasCreds);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const normalizedRole = userRole?.role?.name?.trim().toLowerCase();
  const isGuest = normalizedRole === 'guest';

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

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      setProfileOpen(false);
    }
  }, [mobileMenuOpen]);

  async function onLogout() {
    await http('/auth/session', { method: 'DELETE' }).catch(() => {});
    clearTokens();
    router.replace('/login');
  }

  const isActive = (href: string) => pathname === href;

  const filteredItems = items
    .filter(({ href, label }) => !(href === '/settings' || label.toLowerCase().includes('настройки')))
    .filter(({ href, label }) => {
      if (!isGuest) return true;
      const lowerLabel = label.toLowerCase();
      const blockedByLabel = GUEST_BLOCKED_LABELS.some((candidate) => lowerLabel.includes(candidate));
      const blockedByPath = GUEST_BLOCKED_PATHS.includes(href);
      return !blockedByLabel && !blockedByPath;
    });

  let navigationItems: Props['items'] = filteredItems;
  if (isGuest) {
    navigationItems = filteredItems.map((item) => {
      if (item.href === '/report') {
        return { ...item, label: 'Отчеты' };
      }
      if (item.href === '/reporting') {
        return { ...item, label: 'Выгрузка' };
      }
      return item;
    });

    const hasReporting = navigationItems.some(({ href }) => href === '/reporting');
    if (!hasReporting) {
      const augmented = [...navigationItems];
      const reportIndex = augmented.findIndex(({ href }) => href === '/report');
      const reportingItem = { label: 'Выгрузка', href: '/reporting' };
      if (reportIndex >= 0) {
        augmented.splice(reportIndex + 1, 0, reportingItem);
      } else {
        augmented.push(reportingItem);
      }
      navigationItems = augmented;
    }
  }

  return (
    <header className="relative mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 focus:outline-none"
          aria-label="На главную Emplacc"
        >
          <Logo className="h-8 w-auto sm:h-9" variant="colored" priority />
          <span className="t-accent-text hidden text-2xl font-bold tracking-tight sm:inline">
            Emplacc
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Search button */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            className="hidden sm:flex items-center gap-2 btn-secondary text-xs py-1.5 px-3"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd"/>
            </svg>
            <span className="text-white/50">Поиск</span>
            <kbd className="rounded border border-white/8 px-1 py-0.5 text-[10px] font-mono text-white/30">⌘K</kbd>
          </button>
          <CommandPalette />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex ml-1">
            {navigationItems.map(({ label, href }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/20'
                      : 'text-white/55 hover:text-white/90 hover:bg-white/5',
                  ].join(' ')}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {hasCreds && user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen(p => !p)}
                className="flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5 ring-1 ring-white/8 transition-all hover:bg-white/9 hover:ring-white/14 focus:outline-none"
              >
                <div className="rounded-full p-[1.5px] bg-gradient-to-br from-emerald-400/70 to-lime-400/70">
                  <Avatar name={`${user.firstName} ${user.lastName}`} email={user.email} url={user.avatarUrl} size="sm" />
                </div>
                <span className="hidden text-sm font-medium text-white/80 md:inline pr-0.5">
                  {formatUserLabel(user)}
                </span>
                <svg className={`h-3.5 w-3.5 text-white/30 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl shadow-2xl animate-fade-in-scale ring-1 ring-white/10 backdrop-blur-xl" style={{background:'rgba(10,22,14,0.92)'}}>
                  <div className="px-4 py-3 border-b border-white/6">
                    <div className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</div>
                    <div className="t-caption truncate">{user.email}</div>
                  </div>
                  <div className="p-1.5">
                    <Link href="/settings" onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-white/75 transition hover:bg-white/7 hover:text-white">
                      <svg className="h-4 w-4 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      Настройки профиля
                    </Link>
                    {(normalizedRole === 'admin' || normalizedRole === 'manager') && (
                      <Link href="/admin" onClick={() => setProfileOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-emerald-300/85 transition hover:bg-emerald-500/10 hover:text-emerald-200">
                        <svg className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 4.418-3.134 7.582-7 9-3.866-1.418-7-4.582-7-9V7l7-4z"/>
                        </svg>
                        Админка
                      </Link>
                    )}
                    <div className="my-1 h-px bg-white/5" />
                    <button type="button" onClick={() => { setProfileOpen(false); void onLogout(); }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-300/80 transition hover:bg-red-500/8 hover:text-red-300">
                      <svg className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                      </svg>
                      Выйти из системы
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={onLogout} className="btn-ghost text-sm">Выйти</button>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Р—Р°РєСЂС‹С‚СЊ РјРµРЅСЋ' : 'РћС‚РєСЂС‹С‚СЊ РјРµРЅСЋ'}
          >
            {mobileMenuOpen ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl t-surface-elevated p-3 shadow-2xl animate-fade-in-scale lg:hidden">
          {hasCreds && user && (
            <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
              <div className="rounded-full p-[1.5px] bg-gradient-to-br from-emerald-400/70 to-lime-400/70 shrink-0">
                <Avatar name={`${user.firstName} ${user.lastName}`} email={user.email} url={user.avatarUrl} size="md" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{formatUserLabel(user)}</p>
                <p className="truncate t-caption">{user.email}</p>
              </div>
            </div>
          )}
          {navigationItems.map(({ label, href }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/20'
                    : 'text-white/65 hover:bg-white/5 hover:text-white',
                ].join(' ')}>
                {label}
              </Link>
            );
          })}
          {(normalizedRole === 'admin' || normalizedRole === 'manager') && (
            <Link href="/admin" onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-300/85 transition hover:bg-emerald-500/10 hover:text-emerald-200">
              🛡 Админка
            </Link>
          )}
          <div className="t-divider" />
          <button type="button"
            onClick={() => { setMobileMenuOpen(false); setProfileOpen(false); void onLogout(); }}
            className="rounded-xl bg-red-500/8 px-3 py-2 text-left text-sm font-medium text-red-300/80 transition hover:bg-red-500/14 hover:text-red-300">
            Выйти из системы
          </button>
        </div>
      )}
    </header>
  );
}

function formatUserLabel(user: { firstName: string; lastName: string }) {
  const firstInitial = user.firstName?.trim().charAt(0).toUpperCase() ?? '';
  const lastName = user.lastName?.trim() ?? '';
  if (!lastName && !firstInitial) {
    return 'РџСЂРѕС„РёР»СЊ';
  }
  return [lastName, firstInitial ? `${firstInitial}.` : ''].join(' ').trim();
}
