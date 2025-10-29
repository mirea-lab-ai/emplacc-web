'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { clearTokens, getRefreshToken } from '@/lib/auth';
import { apiLogout } from '@/features/auth/api';
import { useUserRole } from '@/features/roles/hooks';

type NavItem = { label: string; href: string };

type Props = {
  items: NavItem[];
};

const GUEST_RESTRICTED_ROUTES = new Set<string>(['/', '/teams']);

export default function Header({ items }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: roleName } = useUserRole();

  const isGuest = (roleName ?? '').trim().toLowerCase() === 'guest';

  const visibleItems = useMemo(() => {
    if (!isGuest) return items;
    return items.filter((item) => !GUEST_RESTRICTED_ROUTES.has(item.href));
  }, [items, isGuest]);

  async function onLogout() {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await apiLogout(refreshToken);
      }
    } catch {
      // Ignore API errors and still reset local session.
    }

    clearTokens();
    router.replace('/login');
  }

  const isActive = (href: string) => pathname === href;

  return (
    <header className="items-center mx-auto px-6 py-4 border-b border-gray-400 max-w-6xl">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="\u0413\u043B\u0430\u0432\u043D\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 Emplacc"
        >
          <Logo className="h-10" variant="colored" priority />
          <span className="text-5xl font-semibold bg-gradient-to-r from-emerald-500 to-lime-400 bg-clip-text text-transparent">
            Emplacc
          </span>
        </Link>

        <nav className="flex gap-10 items-center">
          {visibleItems.map(({ label, href }) => {
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
          <button
            onClick={onLogout}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 ring-1 ring-white/20"
          >
            {'\u0412\u044B\u0439\u0442\u0438'}
          </button>
        </nav>
      </div>
    </header>
  );
}

