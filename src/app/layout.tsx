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
        <body className={`${inter.className} flex h-full flex-col overflow-hidden text-white`}>
        <div className="flex h-full flex-1 flex-col overflow-hidden">
        {children}
        </div>
        </body>
        </html>
    );
}
