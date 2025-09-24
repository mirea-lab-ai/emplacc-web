'use client';
import { PropsWithChildren } from 'react';

export default function Modal({
                                  children,
                                  onClose,
                              }: PropsWithChildren<{ onClose: () => void }>) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-black relative z-[101] w-full max-w-3xl rounded-2xl">
            <div className=" rounded-2xl t-accent-grad/20 ring-1 ring-white/10 p-6">
                {children}
            </div>
            </div>
        </div>
    );
}
