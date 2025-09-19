'use client';
import { useState } from 'react';
import Modal from '@/components/ui/ModalForHelp';
import Avatar from '@/components/ui/Avatar';
import SelectedChip from '@/components/ReportWizard/SelectedChip';
import { useEmployeeSearch } from '@/hooks/useEmployeeSearch';
import { Employee } from '@/lib/types';

export default function HelpSearchModal({
                                            open, onClose, employees, selected, onAdd, onRemove,
                                        }: {
    open: boolean;
    onClose: () => void;
    employees: Employee[];
    selected: Employee[];
    onAdd: (e: Employee) => void;
    onRemove: (id: string) => void;
}) {
    const [query, setQuery] = useState('');
    const results = useEmployeeSearch(
        employees ?? [],
        query ?? '',
        (selected ?? []).map((s) => s.id)
    );
    if (!open) return null;

    return (
        <Modal onClose={onClose}>
            <div className="w-full max-w-2xl">
                <h3 className="text-2xl font-semibold text-slate-100 mb-4">Кого позвать на помощь?</h3>

                <div className="relative mb-4">
                    <input
                        autoFocus value={query} onChange={e=>setQuery(e.target.value)}
                        placeholder="Поиск по имени, email, роли…"
                        className="w-full rounded-xl bg-[#0f172a] text-slate-100 placeholder:text-slate-400 px-4 py-3 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                    />
                    {query && (
                        <button onClick={()=>setQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200" aria-label="Очистить">×</button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Выбранные */}
                    <div className="md:col-span-1">
                        <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                            <div className="text-sm text-slate-300 mb-2">Выбранные</div>
                            <div className="flex flex-col gap-2 max-h-56 overflow-auto">
                                {selected.length === 0
                                    ? <div className="text-slate-400 text-sm">Пока никого…</div>
                                    : selected.map(emp => (
                                        <SelectedChip key={emp.id} emp={emp} onRemove={()=>onRemove(emp.id)} />
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Результаты */}
                    <div className="md:col-span-2">
                        <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                            <div className="text-sm text-slate-300 mb-2">Результаты</div>
                            <div className="flex flex-col gap-2 max-h-56 overflow-auto">
                                {results.length === 0
                                    ? <div className="text-slate-400 text-sm">Ничего не найдено…</div>
                                    : results.map(emp => (
                                        <button key={emp.id} onClick={()=>onAdd(emp)}
                                                className="flex items-center gap-3 rounded-lg bg-[#0b1324]/60 hover:bg-[#0b1324]/80 px-3 py-2 ring-1 ring-white/10 text-left">
                                            <Avatar name={emp.name} url={emp.avatarUrl} />
                                            <div className="min-w-0">
                                                <div className="text-slate-100 text-sm truncate">{emp.name}</div>
                                                <div className="text-slate-400 text-xs truncate">{emp.email || emp.role || 'Сотрудник'}</div>
                                            </div>
                                            <span className="ml-auto text-cyan-300 text-xs">Добавить</span>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="rounded-xl px-4 py-2 bg-white/10 text-slate-100 ring-1 ring-white/10 hover:bg-white/15">
                        Подтвердить
                    </button>
                </div>
            </div>
        </Modal>
    );
}
