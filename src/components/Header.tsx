'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearTokens, getRefreshToken } from '@/lib/auth';
import { apiLogout } from '@/features/auth/api';
import { useRouter } from 'next/navigation';


type Props = {
  items: { label:string; href:string }[];     // или назови hrefs, если хочешь
};

export default function Header({ items }: Props) {
    const router = useRouter();

    async function onLogout() {
        try {
            const rt = getRefreshToken();
            if (rt) await apiLogout(rt); // по спецификации
        } catch (_) {
        }
        clearTokens();
        router.replace('/login');
    }

    const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href;

  return (
    <header className=" items-center bg-emerald-950  mx-auto px-6 py-4 border-b border-gray-400 max-w-6xl ">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">Emplacc</div>
          <button onClick={onLogout} className="text-sm opacity-80 hover:opacity-100">
              Выйти
          </button>

        <nav className="flex gap-10">
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
