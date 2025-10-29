'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { clearTokens, getRefreshToken, getUserId, isAuthed } from '@/lib/auth';
import { apiLogout } from '@/features/auth/api';


type Props = {
  items: { label:string; href:string }[];     // или назови hrefs, если хочешь
};

const GUEST_RESTRICTED_ROUTES = new Set<string>(['/', '/teams']);

export default function Header({ items }: Props) {
    const router = useRouter();

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
          aria-label="\u0413\u043B\u0430\u0432\u043D\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 Emplacc"
        >
          <Logo className="h-9 w-auto sm:h-10" variant="colored" priority />
          <span className="hidden bg-gradient-to-r from-emerald-500 to-lime-400 bg-clip-text text-3xl font-semibold text-transparent sm:inline md:text-4xl lg:text-5xl">
            Emplacc
          </span>
        </Link>
        
        <nav className="flex gap-10 items-center">
          {items.map(({ label, href }) => {
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
          <button onClick={onLogout} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 ring-1 ring-white/20">
            Выйти
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
            Выйти из аккаунта
          </button>
        </div>
      )}
    </header>
  );
}
