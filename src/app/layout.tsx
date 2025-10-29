import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Emplacc',
    description: 'Track tasks and time',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="h-full">
        <body className={`${inter.className} flex h-full flex-col overflow-hidden bg-[#06140f] bg-[radial-gradient(900px_500px_at_20%_-10%,rgba(34,197,94,0.18),transparent),radial-gradient(900px_500px_at_100%_20%,rgba(132,204,22,0.15),transparent)] text-white`}>
        <div className="flex h-full flex-1 flex-col overflow-hidden">
        {children}
        </div>
        </body>
        </html>
    );
}
