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
        <html lang="en">
        <body className={`${inter.className} overflow-x-hidden bg-[#06140f] bg-[radial-gradient(900px_500px_at_20%_-10%,rgba(34,197,94,0.18),transparent),radial-gradient(900px_500px_at_100%_20%,rgba(132,204,22,0.15),transparent)] text-white`}>
        {children}
        </body>
        </html>
    );
}
