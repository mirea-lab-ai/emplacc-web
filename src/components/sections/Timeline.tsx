'use client';

import ProgressBar from '@/components/ui/ProgressBar';

function fmt(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}:${String(m).padStart(2, '0')}ч.`;
}

export default function Timeline({
                                     elapsed, plannedSeconds,
                                 }: { elapsed: number; plannedSeconds: number }) {
    const progress = Math.min(100, Math.round((elapsed / plannedSeconds) * 100));
    return (
        <section className="mt-6">
            <h2 className="mb-2 text-lg font-semibold">Таймлайн «План — Факт»</h2>
            <ProgressBar value={progress} />
            <div className="mt-2 text-sm text-slate-300">
                {fmt(elapsed)}/{fmt(plannedSeconds)}
            </div>
        </section>
    );
}
