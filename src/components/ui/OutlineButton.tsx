import React from 'react';

export default function OutlineButton({
                                          children, onClick, type = 'button',
                                      }: { children: React.ReactNode; onClick?: () => void; type?: 'button'|'submit'|'reset' }) {
    return (
        <button
            type={type}
            onClick={onClick}
            className="rounded-lg border border-slate-500 px-4 py-2 text-sm hover:bg-slate-800/60 active:translate-y-px"
        >
            {children}
        </button>
    );
}
