export const metadata = {
    title: 'Вход — Emplacc',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
        <body>
        <div className="min-h-dvh grid place-items-center p-6">
            {children}
        </div>
        </body>
        </html>
    );
}
