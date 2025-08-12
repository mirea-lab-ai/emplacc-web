import React from 'react';

export default function Card({
                                 children,
                                 className = '',
                             }: { children: React.ReactNode; className?: string }) {
    return (
        <section className={
            'rounded-2xl border border-slate-600 bg-slate-800/60 p-5 shadow-inner ' + className
        }>
            {children}
        </section>
    );
}
