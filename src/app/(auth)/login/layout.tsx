// app/(auth)/layout.tsx
export const metadata = {
    title: 'Вход — Emplacc',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    // без <html>/<body> и без провайдеров/гейтов
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
