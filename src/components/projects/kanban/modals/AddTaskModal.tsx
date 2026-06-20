'use client';

import { useState, useMemo, useEffect } from 'react';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import DatePicker from '@/components/ui/DatePicker';
import { improveText } from '@/features/tasks/api';
import Modal from '../ui/Modal';
import { ButtonGhost, ButtonPrimary } from '../ui/Buttons';
import Avatar from '@/components/ui/Avatar';
import SelectedChip from '@/components/ReportWizard/SelectedChip';
import { useAllUsers } from '@/features/user/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { Employee } from '@/lib/types';
import { TASK_PRIORITY_OPTIONS, type TaskPriorityValue } from '@/features/tasks/types';
import { getErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';

export default function AddTaskModal({
                                        open,
                                        onClose,
                                        onCreate,
                                        isSubmitting = false,
                                    }: {
    open: boolean;
    onClose: () => void;
    onCreate: (title: string, desc?: string, assignedTo?: string, deadline?: string, priority?: number) => Promise<void>;
    isSubmitting?: boolean;
}) {
    const toast = useToast();
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [improving, setImproving] = useState(false);
    const [assignedTo, setAssignedTo] = useState<Employee | null>(null);
    const [deadline, setDeadline] = useState('');
    const defaultPriority = (TASK_PRIORITY_OPTIONS[0]?.value ?? 1) as TaskPriorityValue;
    const [priority, setPriority] = useState<TaskPriorityValue>(defaultPriority);
    const [showUserSelector, setShowUserSelector] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const clearSubmitError = () => {
        if (submitError) {
            setSubmitError(null);
        }
    };
    
    const isClient = useIsClient();
    const hasCreds = isClient && isAuthed();
    const { data: users, isLoading } = useAllUsers(1, 100, hasCreds);
    const [query, setQuery] = useState('');
    
    // Включаем всех пользователей (включая текущего) для назначения на задачи
    const availableUsers = useMemo(() => {
        if (!users) return [];
        
        return users.map(user => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            avatarUrl: undefined,
            role: user.specialization ?? user.profession,
            specialization: user.specialization,
        }));
    }, [users]);
    
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
    
    const handleUserSelect = (user: Employee) => {
        setAssignedTo(user);
        setShowUserSelector(false);
        setQuery('');
        clearSubmitError();
    };
    
    const handleRemoveUser = () => {
        setAssignedTo(null);
        clearSubmitError();
    };

    useEffect(() => {
        if (open) {
            setSubmitError(null);
            return;
        }

        setTitle('');
        setDesc('');
        setAssignedTo(null);
        setDeadline('');
        setPriority(defaultPriority);
        setQuery('');
        setShowUserSelector(false);
        setSubmitError(null);
    }, [open, defaultPriority]);

    const handleSubmit = async () => {
        if (!title.trim()) return;
        clearSubmitError();

        try {
            await onCreate(
                title.trim(),
                desc.trim() || undefined,
                assignedTo?.id,
                deadline || undefined,
                priority,
            );
            onClose();
        } catch (err) {
            const message = getErrorMessage(err);
            setSubmitError(message.startsWith('Не удалось') ? message : `Не удалось создать задачу: ${message}`);
        }
    };

    if (!open) return null;

    return (
        <>
            <Modal
                title="Новая задача"
                onClose={onClose}
                footer={
                    <>
                        <ButtonGhost onClick={() => { if (!isSubmitting) onClose(); }}>Отмена</ButtonGhost>
                        <ButtonPrimary
                            onClick={() => { void handleSubmit(); }}
                            disabled={!title.trim() || isSubmitting}
                        >
                            {isSubmitting ? 'Добавление...' : 'Добавить'}
                        </ButtonPrimary>
                    </>
                }
            >
                <div className="space-y-4">
                    {submitError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 whitespace-pre-line">
                            {submitError}
                        </div>
                    )}
                    <label className="grid gap-2">
                        <span className="text-app-2">Введите название задачи</span>
                        <input
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                clearSubmitError();
                            }}
                            className="h-12 rounded-xl backdrop-blur-sm bg-app-hover border border-app hover:bg-app-hover px-4 ring-1 ring-app text-app focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="Например, Сделать поиск"
                        />
                    </label>
                    
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-app-2">Введите описание задачи</span>
                            <button
                                type="button"
                                disabled={improving || !desc.trim()}
                                onClick={async () => {
                                    setImproving(true);
                                    try { setDesc(await improveText(desc)); } catch { toast.error('Не удалось улучшить текст'); }
                                    finally { setImproving(false); }
                                }}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                            >
                                {improving ? <span className="animate-pulse">AI…</span> : <>✨ AI улучшить</>}
                            </button>
                        </div>
                        <MarkdownEditor
                            value={desc}
                            onChange={(v) => { setDesc(v); clearSubmitError(); }}
                            placeholder="Кратко опишите детали задачи…"
                            rows={4}
                        />
                    </div>
                    
                    <div className="grid gap-2">
                        <span className="text-app-2">Укажите дедлайн задачи</span>
                        <div className="h-12 rounded-xl backdrop-blur-sm bg-app-hover border border-app hover:bg-app-hover px-4 ring-1 ring-app flex items-center">
                            <DatePicker
                                value={deadline ? new Date(deadline).toISOString() : undefined}
                                onChange={iso => { setDeadline(iso ? iso.split('T')[0] : ''); clearSubmitError(); }}
                                className="text-app text-sm w-full justify-between"
                                placeholder="Не задан"
                            />
                        </div>
                    </div>
                    
                    <label className="grid gap-2">
                        <span className="text-app-2">Выберите приоритет задачи</span>
                        <select
                            value={priority}
                            onChange={(e) => {
                                setPriority(Number(e.target.value) as TaskPriorityValue);
                                clearSubmitError();
                            }}
                            className="h-12 rounded-xl backdrop-blur-sm bg-app-hover border border-app hover:bg-app-hover px-4 ring-1 ring-app text-app focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                            {TASK_PRIORITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className="t-surface-elevated text-app">
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    
                    <div className="grid gap-2">
                        <span className="text-app-2">Назначьте человека на задачу</span>
                        {assignedTo ? (
                            <div className="flex items-center gap-2">
                                <SelectedChip
                                    emp={assignedTo}
                                    onRemove={handleRemoveUser}
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowUserSelector(true)}
                                className="h-12 rounded-xl backdrop-blur-sm bg-app-hover border border-app hover:bg-app-hover px-4 ring-1 ring-app text-app-2 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            >
                                Назначить сотрудника...
                            </button>
                        )}
                    </div>
                </div>
            </Modal>
            
            {/* Модалка выбора пользователя */}
            {showUserSelector && (
                <Modal
                    title="Выберите сотрудника"
                    onClose={() => {
                        setShowUserSelector(false);
                        setQuery('');
                    }}
                    footer={
                        <ButtonGhost onClick={() => {
                            setShowUserSelector(false);
                            setQuery('');
                        }}>
                            Отмена
                        </ButtonGhost>
                    }
                >
                <div className="space-y-4">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            clearSubmitError();
                        }}
                        placeholder="Поиск по имени, email или роли..."
                        className="w-full h-12 rounded-xl backdrop-blur-sm bg-app-hover border border-app hover:bg-app-hover px-4 ring-1 ring-app text-app focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    
                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {isLoading ? (
                            <div className="text-center text-app-2 py-4">Загрузка...</div>
                        ) : results.length === 0 ? (
                            <div className="text-center text-app-2 py-4">
                                {query ? 'Никого не найдено' : 'Нет доступных сотрудников'}
                            </div>
                        ) : (
                            results.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleUserSelect(user)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-app-hover transition-colors text-left"
                                >
                                    <Avatar name={user.name} url={user.avatarUrl} email={user.email} fallbackKey={user.id} size="sm" />
                                    <div>
                                        <div className="text-app font-medium">{user.name}</div>
                                        {user.role && (
                                            <div className="text-app-2 text-sm">{user.role}</div>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
                </Modal>
            )}
        </>
    );
}
