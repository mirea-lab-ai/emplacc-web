'use client';
import { PropsWithChildren, useEffect, useRef } from 'react';

const FOCUSABLE =
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Modal({
                                  children,
                                  onClose,
                              }: PropsWithChildren<{ onClose: () => void }>) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const prevActive = document.activeElement as HTMLElement | null;
        const raf = requestAnimationFrame(() => {
            const panel = panelRef.current;
            if (!panel) return;
            (panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
        });
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
        };
        document.addEventListener('keydown', onKey, true);
        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('keydown', onKey, true);
            prevActive?.focus?.();
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div ref={panelRef} tabIndex={-1} className="relative z-[101] w-full max-w-3xl outline-none">
                <div className="max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl t-surface-elevated">
                    <div className="rounded-2xl t-accent-grad/20 p-6 ring-1 ring-app">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
