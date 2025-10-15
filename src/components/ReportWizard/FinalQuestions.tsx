'use client';

import { useMemo, useState, useEffect } from 'react';
import HelpSearchModal from '@/components/ReportWizard/HelpSearchModal';
import ProblemSelector from '@/components/ProblemSelector';
import { Employee } from '@/lib/types';

type Need = 'yes' | 'no' | null;

type FinalQuestionsProps = {
    selectedProblems: Set<string>;
    onToggleProblem: (problemId: string) => void;
    needHelp: Need;
    setNeedHelp: (v: Need) => void;
    helpComments: Record<string, string>; // userId -> comment
    setHelpComments: (comments: Record<string, string>) => void;
    onHelpersChange: (helpers: Employee[]) => void;
    reportDate: string;
    setReportDate: (date: string) => void;
};

export default function FinalQuestions({
                                           selectedProblems, onToggleProblem, needHelp, setNeedHelp, helpComments, setHelpComments, onHelpersChange, reportDate, setReportDate,
                                       }: FinalQuestionsProps) {
    const [selected, setSelected] = useState<Employee[]>([]);
    const [open, setOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const add = (emp: Employee) => {
        setSelected(prev => {
            const newSelected = prev.find(e => e.id === emp.id) ? prev : [...prev, emp];
            // Если это первый пользователь, делаем его выделенным
            if (newSelected.length === 1 && !selectedUserId) {
                setSelectedUserId(emp.id);
            }
            return newSelected;
        });
    };
    
    const remove = (id: string) => {
        setSelected(prev => {
            const newSelected = prev.filter(e => e.id !== id);
            // Если удаляем выделенного пользователя, выделяем первого из оставшихся
            if (selectedUserId === id) {
                setSelectedUserId(newSelected.length > 0 ? newSelected[0].id : null);
            }
            return newSelected;
        });
    };

    const canAddMore = selected.length > 0;
    const selectedUser = selected.find(u => u.id === selectedUserId);

    const onYes = () => { setNeedHelp('yes'); setOpen(true); };
    const onNo = () => { setNeedHelp('no'); setSelected([]); setSelectedUserId(null); };

    const updateHelpComment = (userId: string, comment: string) => {
        setHelpComments({
            ...helpComments,
            [userId]: comment
        });
    };

    // Передаем выбранных пользователей в родительский компонент
    useEffect(() => {
        onHelpersChange(selected);
    }, [selected, onHelpersChange]);

    return (
        <div className="rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 p-6 ring-1 ring-white/5">
            <h2 className="text-3xl font-semibold mb-6">Завершающие вопросы</h2>

            <div className="grid gap-6">
                <div>
                    <label className="block text-slate-200 mb-2">Дата отчета</label>
                    <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="w-auto min-w-[200px] rounded-xl t-surface text-slate-100 p-3 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                </div>

                <div>
                    <label className="block text-slate-200 mb-2">Проблема</label>
                    <ProblemSelector 
                        selectedProblems={selectedProblems}
                        onToggleProblem={onToggleProblem}
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
                                <div key={emp.id} className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedUserId(emp.id)}
                                        className={`shrink-0 rounded-lg px-3 py-2 ring-1 transition-colors ${
                                            selectedUserId === emp.id
                                                ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30'
                                                : 'bg-white/10 text-slate-100 ring-white/15 hover:bg-white/15'
                                        }`}
                                    >
                                        {emp.name}
                                    </button>
                                    <button
                                        onClick={() => remove(emp.id)}
                                        className="text-slate-400 hover:text-red-400 transition-colors"
                                        title="Удалить"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Комментарий к запросу помощи */}
                {selected.length > 0 && selectedUser && (
                    <div className="space-y-2">
                        <label className="block text-slate-300 text-sm">
                            Комментарий к запросу помощи у {selectedUser.name}
                        </label>
                        <textarea
                            value={helpComments[selectedUser.id] || ''}
                            onChange={(e) => updateHelpComment(selectedUser.id, e.target.value)}
                            placeholder={`Опишите, с чем нужна помощь от ${selectedUser.name}...`}
                            className="w-full min-h-[80px] rounded-xl t-surface text-slate-100 p-3 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                        />
                    </div>
                )}
            </div>

            <HelpSearchModal
                open={open}
                onClose={() => setOpen(false)}
                selected={selected ?? []}
                onAdd={add}
                onRemove={remove}
            />
        </div>
    );
}
