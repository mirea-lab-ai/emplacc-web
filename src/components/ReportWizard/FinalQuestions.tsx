'use client';

import { useMemo, useState } from 'react';
import HelpSearchModal from '@/components/ReportWizard/HelpSearchModal';
import SelectedChip from '@/components/ReportWizard/SelectedChip';
import { Employee } from '@/lib/types';

type Need = 'yes' | 'no' | null;

type FinalQuestionsProps = {
    problem: string;
    setProblem: (v: string) => void;
    needHelp: Need;
    setNeedHelp: (v: Need) => void;
    comment: string;
    setComment: (v: string) => void;
    employees: Employee[];
};

export default function FinalQuestions({
                                           problem, setProblem, needHelp, setNeedHelp, comment, setComment, employees = [],
                                       }: FinalQuestionsProps) {
    const [selected, setSelected] = useState<Employee[]>([]);
    const [open, setOpen] = useState(false);

    const add = (emp: Employee) =>
        setSelected(prev => prev.find(e => e.id === emp.id) ? prev : [...prev, emp]);
    const remove = (id: string) =>
        setSelected(prev => prev.filter(e => e.id !== id));

    const canAddMore = selected.length > 0;

    const onYes = () => { setNeedHelp('yes'); setOpen(true); };
    const onNo = () => { setNeedHelp('no'); setSelected([]); };

    // Проброс выбранных наружу при необходимости — через эффект/проп (опционально)

    return (
        <div className="rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 p-6 ring-1 ring-white/5">
            <h2 className="text-3xl font-semibold mb-6">Завершающие вопросы</h2>

            <div className="grid gap-6">
                <div>
                    <label className="block text-slate-200 mb-2">Проблема</label>
                    <textarea
                        value={problem}
                        onChange={(e) => setProblem(e.target.value)}
                        placeholder="Опишите возникшие сложности…"
                        className="w-full min-h-[140px] rounded-xl t-surface text-slate-100 p-4 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                </div>

                <div>
                    <span className="block text-slate-200 mb-2">Нужна ли чья-то помощь?</span>

                    <div className="flex items-center gap-3">
                        {/* Да/Нет */}
                        <div className="flex gap-3">
                            <button
                                type="button" onClick={onYes}
                                className={[
                                    'rounded-xl px-5 py-2 ring-1 transition',
                                    needHelp === 'yes'
                                        ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/50'
                                        : 'bg-black/20 text-slate-200 ring-white/10 hover:bg-black/30',
                                ].join(' ')}
                            >Да</button>

                            <button
                                type="button" onClick={onNo}
                                className={[
                                    'rounded-xl px-5 py-2 ring-1 transition',
                                    needHelp === 'no'
                                        ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/50'
                                        : 'bg-black/20 text-slate-200 ring-white/10 hover:bg-black/30',
                                ].join(' ')}
                            >Нет</button>
                        </div>

                        {/* Горизонтальный список выбранных */}
                        <div className="flex items-center gap-2 ml-2 overflow-x-auto">
                            {canAddMore && (
                                <button
                                    type="button"
                                    onClick={() => setOpen(true)}
                                    className="shrink-0 rounded-lg px-3 py-2 bg-white/10 text-slate-100 ring-1 ring-white/15 hover:bg-white/15"
                                    title="Добавить ещё"
                                >
                                    + Добавить
                                </button>
                            )}
                            {selected.map(emp => (
                                <SelectedChip key={emp.id} emp={emp} onRemove={() => remove(emp.id)} />
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-slate-200 mb-2">Комментарий</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Любые дополнительные заметки…"
                        className="w-full min-h-[120px] rounded-xl t-surface text-slate-100 p-4 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                </div>
            </div>

            <HelpSearchModal
                open={open}
                onClose={() => setOpen(false)}
                employees={employees ?? []}
                selected={selected ?? []}
                onAdd={add}
                onRemove={remove}
            />
        </div>
    );
}
