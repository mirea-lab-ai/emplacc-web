'use client';

import { useEffect, useMemo, useState } from 'react';
import KanbanHeader from './KanbanHeader';
import Column from './Column';
import AddColumnModal from './modals/AddColumnModal';
import RenameColumnModal from './modals/RenameColumnModal';
import AddTaskModal from './modals/AddTaskModal';
import { KBColumn } from './types';
import { uid } from '@/lib/uid' // если путь иной, поправь импорт

export default function KanbanBoard({
                                        columns,
                                        onChange,
                                        viewportOffset = 160,
                                    }: {
    columns: KBColumn[];
    onChange: (cols: KBColumn[]) => void;
    viewportOffset?: number;
}) {
    const [local, setLocal] = useState<KBColumn[]>(columns);
    useEffect(() => setLocal(columns), [columns]);
    useEffect(() => onChange(local), [local, onChange]);

    const colIndex = useMemo(
        () => Object.fromEntries(local.map((c, i) => [c.id, i])) as Record<string, number>,
        [local]
    );

    /* ---------- CRUD колонок ---------- */
    // вставка только между: index ∈ [1..len-1]
    const insertBetween = (betweenIndex: number, title: string) => {
        const t = title.trim(); if (!t || local.length < 2) return;
        const at = Math.max(1, Math.min(betweenIndex, local.length - 1));
        setLocal(prev => {
            const copy = [...prev];
            copy.splice(at, 0, { id: uid(), title: t, tasks: [] });
            return copy;
        });
    };

    const renameColumn = (id: string, title: string) => {
        const t = title.trim(); if (!t) return;
        setLocal(prev => prev.map(c => (c.id === id ? { ...c, title: t } : c)));
    };

    const removeColumn = (id: string) => {
        setLocal(prev => prev.filter(c => c.id !== id));
    };

    /* ---------- CRUD задач ---------- */
    const addTask = (colId: string, title: string, desc?: string) => {
        const t = title.trim(); if (!t) return;
        setLocal(prev =>
            prev.map(c => (c.id === colId ? { ...c, tasks: [...c.tasks, { id: uid(), title: t, desc }] } : c))
        );
    };
    const removeTask = (colId: string, taskId: string) => {
        setLocal(prev =>
            prev.map(c => (c.id === colId ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) } : c))
        );
    };

    /* ---------- DnD (только в соседнюю) ---------- */
    const onDropCard = (toColId: string, data: { taskId: string; fromColId: string }) => {
        const fromI = colIndex[data.fromColId];
        const toI = colIndex[toColId];
        if (fromI == null || toI == null) return;
        if (Math.abs(fromI - toI) > 1) return;
        setLocal(prev => {
            const cols = prev.map(c => ({ ...c, tasks: [...c.tasks] }));
            const from = cols.find(c => c.id === data.fromColId)!;
            const to = cols.find(c => c.id === toColId)!;
            const idx = from.tasks.findIndex(t => t.id === data.taskId);
            if (idx === -1) return prev;
            const [moved] = from.tasks.splice(idx, 1);
            to.tasks.push(moved);
            return cols;
        });
    };

    /* ---------- Модалки ---------- */
    const [addOpen, setAddOpen] = useState(false);
    const [rename, setRename] = useState<null | { id: string; title: string }>(null);
    const [addTaskFor, setAddTaskFor] = useState<null | string>(null);

    return (
        <div className="flex flex-col gap-4 " style={{ height: `calc(100dvh - ${viewportOffset}px)` }}>
            <KanbanHeader canAdd={local.length >= 2} onAddColumn={() => setAddOpen(true)} />

            <div className="flex-1 min-h-0 overflow-x-auto custom-scroll">
                <div className="flex h-full items-stretch gap-4 pb-2 min-h-0">
                    {local.map((col) => (
                        <Column
                            key={col.id}
                            column={col}
                            onDrop={(payload) => onDropCard(col.id, payload)}
                            onAddTask={() => setAddTaskFor(col.id)}
                            onRename={() => setRename({ id: col.id, title: col.title })}
                            onRemove={() => removeColumn(col.id)}
                            onRemoveTask={(taskId) => removeTask(col.id, taskId)}
                        />
                    ))}
                </div>
            </div>

            {/* модалки */}
            <AddColumnModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                columns={local}
                onSubmit={(betweenIndex, title) => insertBetween(betweenIndex, title)}
            />

            {rename && (
                <RenameColumnModal
                    open
                    initial={rename.title}
                    onClose={() => setRename(null)}
                    onSave={(newTitle) => renameColumn(rename.id, newTitle)}
                />
            )}

            <AddTaskModal
                open={!!addTaskFor}
                onClose={() => setAddTaskFor(null)}
                onCreate={(title, desc) => addTask(addTaskFor!, title, desc)}
            />
        </div>
    );
}
