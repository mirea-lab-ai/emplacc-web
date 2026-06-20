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
        <div className="rounded-2xl backdrop-blur-md bg-app-subtle border border-app p-6 ring-1 ring-app">
            <h2 className="text-3xl font-semibold mb-6">Завершающие вопросы</h2>

            <div className="grid gap-6">
                <div>
                    <label className="block text-app-2 mb-2">Дата отчета</label>
                    <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="w-full max-w-xs rounded-xl t-surface p-3 text-app ring-1 ring-app focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                </div>

                <div>
                    <label className="block text-app-2 mb-2">Проблема</label>
                    <ProblemSelector 
                        selectedProblems={selectedProblems}
                        onToggleProblem={onToggleProblem}
                    />
                </div>

                <div>
                    <span className="block text-app-2 mb-2">Нужна ли чья-то помощь?</span>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {/* Да/Нет */}
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button" onClick={onYes}
                                className={[
                                    'rounded-xl px-5 py-2 ring-1 transition',
                                    needHelp === 'yes'
                                        ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/50'
                                        : 'bg-app-subtle text-app-2 ring-app hover:bg-app-hover',
                                ].join(' ')}
                            >Да</button>

                            <button
                                type="button" onClick={onNo}
                                className={[
                                    'rounded-xl px-5 py-2 ring-1 transition',
                                    needHelp === 'no'
                                        ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/50'
                                        : 'bg-app-subtle text-app-2 ring-app hover:bg-app-hover',
                                ].join(' ')}
                            >Нет</button>
                        </div>

                        {/* Горизонтальный список выбранных */}
                        <div className="flex flex-wrap items-center gap-2 sm:ml-2">
                            {canAddMore && (
                                <button
                                    type="button"
                                    onClick={() => setOpen(true)}
                                    className="shrink-0 rounded-lg px-3 py-2 bg-app-hover text-app ring-1 ring-app hover:bg-app-hover"
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
                                                : 'bg-app-hover text-app ring-app hover:bg-app-hover'
                                        }`}
                                    >
                                        {emp.name}
                                    </button>
                                    <button
                                        onClick={() => remove(emp.id)}
                                        className="text-app-2 hover:text-red-400 transition-colors"
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
                        <label className="block text-app-2 text-sm">
                            Комментарий к запросу помощи у {selectedUser.name}
                        </label>
                        <textarea
                            value={helpComments[selectedUser.id] || ''}
                            onChange={(e) => updateHelpComment(selectedUser.id, e.target.value)}
                            placeholder={`Опишите, с чем нужна помощь от ${selectedUser.name}...`}
                            className="w-full min-h-[80px] rounded-xl t-surface text-app p-3 ring-1 ring-app focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
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
