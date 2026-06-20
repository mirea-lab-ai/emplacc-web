'use client';
import { useState, useMemo } from 'react';
import Modal from '@/components/ui/ModalForHelp';
import Avatar from '@/components/ui/Avatar';
import SelectedChip from '@/components/ReportWizard/SelectedChip';
import { useAllUsers } from '@/features/user/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';
import { Employee } from '@/lib/types';

export default function HelpSearchModal({
                                            open, onClose, selected, onAdd, onRemove,
                                        }: {
    open: boolean;
    onClose: () => void;
    selected: Employee[];
    onAdd: (e: Employee) => void;
    onRemove: (id: string) => void;
}) {
    const isClient = useIsClient();
    const hasCreds = isClient && isAuthed();
    const { data: users, isLoading } = useAllUsers(1, 100, hasCreds);
    const [query, setQuery] = useState('');
    
    // Исключаем текущего пользователя и уже выбранных
    const availableUsers = useMemo(() => {
        if (!users) return [];
        const currentUserId = getUserId();
        const selectedIds = selected.map(s => s.id);
        
        return users
            .filter(user => user.id !== currentUserId && !selectedIds.includes(user.id))
            .map(user => ({
                id: user.id,
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                avatarUrl: undefined,
                role: user.specialization ?? user.profession,
                specialization: user.specialization,
            }));
    }, [users, selected]);
    
    // Фильтруем по поисковому запросу
    const results = useMemo(() => {
        if (!query.trim()) return availableUsers;
        
        const searchTerm = query.toLowerCase();
        return availableUsers.filter(user => 
            user.name.toLowerCase().includes(searchTerm) ||
            user.email?.toLowerCase().includes(searchTerm) ||
            user.role?.toLowerCase().includes(searchTerm)
        );
    }, [availableUsers, query]);
    if (!open) return null;

    return (
        <Modal onClose={onClose}>
            <div className="w-full max-w-2xl">
                <h3 className="text-2xl font-semibold text-app mb-4">Кого позвать на помощь?</h3>

                <div className="relative mb-4">
                    <input
                        autoFocus value={query} onChange={e=>setQuery(e.target.value)}
                        placeholder="Поиск по имени, email, роли…"
                        className="w-full rounded-xl t-surface text-app placeholder:text-app-3 px-4 py-3 ring-1 ring-app focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                    />
                    {query && (
                        <button onClick={()=>setQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-app-2 hover:text-app" aria-label="Очистить">×</button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Выбранные */}
                    <div className="md:col-span-1">
                        <div className="rounded-xl bg-app-subtle ring-1 ring-app p-3">
                            <div className="text-sm text-app-2 mb-2">Выбранные</div>
                            <div className="flex flex-col gap-2 max-h-56 overflow-auto">
                                {selected.length === 0
                                    ? <div className="text-app-2 text-sm">Пока никого…</div>
                                    : selected.map(emp => (
                                        <SelectedChip key={emp.id} emp={emp} onRemove={()=>onRemove(emp.id)} />
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Результаты */}
                    <div className="md:col-span-2">
                        <div className="rounded-xl bg-app-subtle ring-1 ring-app p-3">
                            <div className="text-sm text-app-2 mb-2">Результаты</div>
                            <div className="flex flex-col gap-2 max-h-56 overflow-auto">
                                {isLoading
                                    ? <div className="text-app-2 text-sm">Загрузка пользователей...</div>
                                    : results.length === 0
                                    ? <div className="text-app-2 text-sm">Ничего не найдено…</div>
                                    : results.map(emp => (
                                        <button key={emp.id} onClick={()=>onAdd(emp)}
                                                className="flex items-center gap-3 rounded-lg t-surface px-3 py-2 ring-1 ring-app text-left">
                                            <Avatar name={emp.name} url={emp.avatarUrl} email={emp.email} fallbackKey={emp.id} />
                                            <div className="min-w-0">
                                                <div className="text-app text-sm truncate">{emp.name}</div>
                                                <div className="text-app-2 text-xs truncate">
                                                    {emp.specialization
                                                        ? `${emp.specialization}${emp.email ? ` · ${emp.email}` : ''}`
                                                        : emp.email || emp.role || 'Сотрудник'}
                                                </div>
                                            </div>
                                            <span className="ml-auto text-app text-xs">Добавить</span>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="rounded-xl px-4 py-2 bg-app-hover text-app ring-1 ring-app hover:bg-app-hover">
                        Подтвердить
                    </button>
                </div>
            </div>
        </Modal>
    );
}
