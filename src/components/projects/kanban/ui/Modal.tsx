'use client';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Panel from '@/components/ui/Panel';

type Props = {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
};

export default function Modal({ title, onClose, children, footer }: Props) {
    // Блокируем скролл страницы при открытой модалке
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    // В некоторых редких случаях document может быть ещё недоступен на сервере,
    // но компонент помечен 'use client', так что это безопасно.
    return createPortal(
        <div
            // fixed чтобы покрыть viewport; z-index высокий чтобы над всем
            className="fixed inset-0 z-50 grid place-items-center p-4"
            // клик по бэкдропу закрывает (проверка currentTarget)
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            aria-modal="true"
            role="dialog"
        >
            {/* затемняющий слой — отдельный элемент чтобы не мешать кликам на контейнер */}
            <div
                aria-hidden
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div className="relative z-10 w-full max-w-lg bg-black rounded-2xl max-h-[90vh] flex flex-col">
            <Panel className="t-accent-grad/20 p-6 flex flex-col h-full">
                <div className="mb-4 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <button
                        onClick={onClose}
                        className="rounded-lg px-3 py-1.5 text-slate-300 hover:text-white"
                        aria-label="Закрыть"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scroll">{children}</div>

                {footer && <div className="mt-6 flex justify-end gap-3 flex-shrink-0">{footer}</div>}
            </Panel>
            </div>
        </div>,
        // монтируем в body, чтобы избежать ограничивающих предков
        document.body
    );
}
