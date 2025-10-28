'use client';
import { PropsWithChildren } from 'react';

export default function Modal({
                                  children,
                                  onClose,
                              }: PropsWithChildren<{ onClose: () => void }>) {
    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-[101] w-full max-w-3xl">
                <div className="max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl bg-black">
                    <div className="rounded-2xl t-accent-grad/20 p-6 ring-1 ring-white/10">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
