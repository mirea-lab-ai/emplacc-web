// segment layout for (main)
import '../globals.css';
import Providers from '@/app/providers';
import AuthGate from '@/components/AuthGate';
import Header from '@/components/Header';

const nav = [
  { label: '\u041C\u043E\u0438 \u0437\u0430\u0434\u0430\u0447\u0438', href: '/' },
  { label: '\u041C\u043E\u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u044B', href: '/projects' },
  { label: '\u041A\u043E\u043C\u0430\u043D\u0434\u044B', href: '/teams' },
  { label: '\u041E\u0442\u0447\u0435\u0442', href: '/report' },
  { label: '\u0424\u043E\u0440\u0443\u043C', href: '/forum' },
  { label: '\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u044F', href: '/settings' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AuthGate>
        <div className="mx-auto max-w-screen items-center p-6">
          <Header items={nav} />
          {children}
        </div>
      </AuthGate>
    </Providers>
  );
}

