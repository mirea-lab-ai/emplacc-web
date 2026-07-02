import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { BRAND, BRAND_NAME } from '@/lib/brand';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: BRAND_NAME,
    description: 'Track tasks and time',
};

const THEME_INIT = `try{var t=localStorage.getItem('emplacc-theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru" className="h-full" data-brand={BRAND}>
        <body className={`${inter.className} flex h-full flex-col overflow-hidden`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <div className="flex h-full flex-1 flex-col overflow-hidden">
        {children}
        </div>
        </body>
        </html>
    );
}
