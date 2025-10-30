'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import Avatar from '@/components/ui/Avatar';
import { clearTokens, getRefreshToken, getUserId, isAuthed } from '@/lib/auth';
import { apiLogout } from '@/features/auth/api';
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
    try {
      const rt = getRefreshToken();
      if (rt) await apiLogout(rt);
    } catch {
      // РёРіРЅРѕСЂРёСЂСѓРµРј РѕС€РёР±РєРё РІС‹С…РѕРґР°
    }
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
    <header className="relative mx-auto w-full max-w-6xl border-b border-white/15 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="РќР° РіР»Р°РІРЅСѓСЋ Emplacc"
        >
          <Logo className="h-9 w-auto sm:h-10" variant="colored" priority />
          <span className="hidden bg-gradient-to-r from-emerald-500 to-lime-400 bg-clip-text text-3xl font-semibold text-transparent sm:inline md:text-4xl lg:text-5xl">
            Emplacc
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-6 lg:flex">
            {navigationItems.map(({ label, href }) => {
              const active = isActive(href);
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
          </nav>

          {hasCreds && user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <Avatar name={`${user.firstName} ${user.lastName}`} email={user.email} size="md" />
                <span className="hidden text-sm font-medium text-white md:inline">
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
                <div className="absolute right-0 z-50 mt-2 max-h-[calc(100vh-6rem)] w-48 overflow-y-auto rounded-xl bg-[#091a14] p-2 shadow-lg ring-1 ring-emerald-400/30">
                  <Link
                    href="/settings"
                    className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                    onClick={() => setProfileOpen(false)}
                  >
                    Настройки
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      void onLogout();
                    }}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/10"
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              Выйти
            </button>
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
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#091a14]/95 p-4 shadow-xl backdrop-blur lg:hidden">
          {hasCreds && user && (
            <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
              <Avatar name={`${user.firstName} ${user.lastName}`} email={user.email} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{formatUserLabel(user)}</p>
                <p className="truncate text-xs text-slate-300">{user.email}</p>
              </div>
            </div>
          )}
          {navigationItems.map(({ label, href }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'rounded-xl px-3 py-2 text-base transition-colors',
                  active
                    ? 'bg-white/10 text-white ring-1 ring-emerald-400/40'
                    : 'text-slate-200 hover:bg-white/5 hover:text-white',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
          <div className="h-px bg-white/10" />
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setProfileOpen(false);
              void onLogout();
            }}
            className="rounded-xl bg-red-500/10 px-3 py-2 text-left text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
          >
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
