'use client';
import React from 'react';

export function ButtonPrimary({
                                  children, onClick, disabled,
                              }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60"
        >
            {children}
        </button>
    );
}

export function ButtonGhost({
                                children, onClick,
                            }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick} className="rounded-lg px-4 py-2 text-slate-300 hover:text-white">
            {children}
        </button>
    );
}
