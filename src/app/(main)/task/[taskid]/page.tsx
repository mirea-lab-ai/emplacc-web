// src/app/(main)/task/[taskid]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import Panel from '@/components/ui/Panel';
import { fetchTaskById } from '@/features/tasks/api';
import {getTaskPriorityMeta, Task} from '@/features/tasks/types';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';

type Props = {
    params: Promise<{ taskid: string }>;
};


export default function TaskPage({ params }: Props) {

    const { taskid } = use(params);
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isClient = useIsClient();
    const hasCreds = isClient && isAuthed();

    useEffect(() => {
        if (!hasCreds) {
            setError('Неавторизовано');
            setLoading(false);
            return;
        }

        let mounted = true;
        setLoading(true);
        setError(null);

        fetchTaskById(String(taskid))
            .then((t) => {
                console.log(t);
                if (!mounted) return;
                setTask(t ?? null);
            })
            .catch((err) => {
                console.error('fetchTaskById error', err);
                if (!mounted) return;
                setError(String(err?.message ?? 'Ошибка загрузки задачи'));
                setTask(null);
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [taskid, hasCreds]);
    const priorityMeta = getTaskPriorityMeta(task?.priority);
    return (
        <main className="min-h-screen text-white">
            <div className="mx-auto max-w-6xl p-6">
                <Panel className="p-6">
                    <div className="flex items-start gap-6">
                        {/* Левая колонка - метаданные */}
                        <aside className="w-80 flex-shrink-0">
                            <div className="space-y-4">
                                <h1 className="text-2xl font-semibold">Информация о задаче</h1>

                                {loading ? (
                                    <div className="text-slate-400">Загрузка...</div>
                                ) : error ? (
                                    <div className="text-red-400">{error}</div>
                                ) : task ? (
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-xs text-slate-400">Название</div>
                                            <div className="mt-1 text-white font-medium">{task.name || 'Без названия'}</div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-slate-400">Создатель</div>
                                            <div className="mt-1 text-slate-200">
                                                {task?.created_by ? task.created_by.first_name + " " + task.created_by.last_name : '–'}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-slate-400">Назначена</div>
                                            <div className="mt-1 text-slate-200">
                                                {task?.assigned_to ? task.assigned_to.first_name + " " + task.assigned_to.last_name : '–'}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-slate-400">Приоритет</div>
                                                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs ring-1 ${priorityMeta.badgeClass}`}>
                                                    {priorityMeta.label}
                                                </span>

                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-slate-400">Задача не найдена</div>
                                )}
                            </div>
                        </aside>

                        {/* Правая область — пространство разделено на две части */}
                        <section className="flex-1 min-w-0">
                            <div className="flex flex-col gap-4 h-full">
                                {/* Описание (верхняя часть) */}
                                <div className="flex-1 mb-2">
                                    <div className="rounded-xl border border-white/10 bg-white/3 p-5 h-full">
                                        <h2 className="text-lg font-semibold mb-3">Описание</h2>
                                        {loading ? (
                                            <div className="text-slate-400">Загрузка описания...</div>
                                        ) : error ? (
                                            <div className="text-red-400">{error}</div>
                                        ) : task?.description ? (
                                            <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">{task.description}</div>
                                        ) : (
                                            <div className="text-slate-500">Описание отсутствует</div>
                                        )}
                                    </div>
                                </div>

                                {/* Заглушка (нижняя часть) */}
                                <div className="h-48">
                                    <div className="rounded-xl border border-white/6 bg-white/2 p-5 h-full grid place-items-center text-slate-400">
                                        Заглушка — здесь будет дополнительный контент (комментарии, логи и т.д.)
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </Panel>
            </div>
        </main>
    );
}
