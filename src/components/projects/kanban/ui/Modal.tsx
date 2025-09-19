'use client';
import React from 'react';
import Panel from '@/components/ui/Panel';

export default function Modal({
                                  title,
                                  onClose,
                                  children,
                                  footer,
                              }: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <Panel className="w-full max-w-lg p-6 bg-emerald-950">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <button
                        onClick={onClose}
                        className="rounded-lg px-3 py-1.5 text-slate-300 hover:text-white"
                        aria-label="Закрыть"
                    >
                        ✕
                    </button>
                </div>
                {children}
                {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
            </Panel>
        </div>
    );
}
