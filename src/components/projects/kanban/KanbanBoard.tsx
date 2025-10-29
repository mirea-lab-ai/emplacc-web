'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import KanbanHeader from './KanbanHeader';
import Column from './Column';
import AddStatusModal from './modals/AddStatusModal';
import RenameColumnModal from './modals/RenameColumnModal';
import AddTaskModal from './modals/AddTaskModal';
import EditTaskModal from './modals/EditTaskModal';
import { KBColumn } from './types';
import { uid } from '@/lib/uid';
import { type UITask } from '@/features/tasks/types';

export default function KanbanBoard({
                                        columns,
                                        onChange,
                                        viewportOffset = 160,
                                        onCreateStatus,
                                        isCreatingStatus = false,
                                        onDeleteStatus,
                                        isDeletingStatus = false,
                                        onCreateTask,
                                        isCreatingTask = false,
                                        onUpdateTask,
                                        isUpdatingTask = false,
                                        onDeleteTask,
                                        isDeletingTask = false,
                                        onMoveTask,
                                        isMovingTask = false,
                                        hideHeader = false,
                                        onHeaderStateChange,
                                        showColumnActions = false,
                                    }: {
    columns: KBColumn[];
    onChange: (cols: KBColumn[]) => void;
    viewportOffset?: number;
    onCreateStatus?: (betweenIndex: number, title: string, color: string) => void;
    isCreatingStatus?: boolean;
    onDeleteStatus?: (statusId: string) => void;
    isDeletingStatus?: boolean;
    onCreateTask?: (
        statusId: string,
        title: string,
        description?: string,
        assignedTo?: string,
        deadline?: string,
        priority?: number,
    ) => Promise<void>;
    isCreatingTask?: boolean;
    onUpdateTask?: (
        taskId: string,
        title: string,
        description?: string,
        assignedTo?: string,
        deadline?: string,
        priority?: number,
    ) => Promise<void>;
    isUpdatingTask?: boolean;
    onDeleteTask?: (taskId: string) => void;
    isDeletingTask?: boolean;
    onMoveTask?: (taskId: string, statusId: string) => void;
    isMovingTask?: boolean;
    hideHeader?: boolean;
    onHeaderStateChange?: (state: { openAddColumn: () => void; canAdd: boolean; isCreating: boolean }) => void;
    showColumnActions?: boolean;
}) {
    const [local, setLocal] = useState<KBColumn[]>(columns);
    useEffect(() => setLocal(columns), [columns]);
    useEffect(() => onChange(local), [local, onChange]);

    const colIndex = useMemo(
        () => Object.fromEntries(local.map((c, i) => [c.id, i])) as Record<string, number>,
        [local]
    );

    /* ---------- CRUD колонок ---------- */
    const insertBetween = (betweenIndex: number, title: string, color: string) => {
        if (onCreateStatus) {
            onCreateStatus(betweenIndex, title, color);
        } else {
            const t = title.trim(); if (!t || local.length < 2) return;
            const at = Math.max(1, Math.min(betweenIndex, local.length - 1));
            setLocal(prev => {
                const copy = [...prev];
                copy.splice(at, 0, { id: uid(), title: t, tasks: [], color });
                return copy;
            });
        }
    };

    const renameColumn = (id: string, title: string) => {
        const t = title.trim(); if (!t) return;
        setLocal(prev => prev.map(c => (c.id === id ? { ...c, title: t } : c)));
    };

    const removeColumn = (id: string) => {
        if (onDeleteStatus) {
            onDeleteStatus(id);
        } else {
            setLocal(prev => prev.filter(c => c.id !== id));
        }
    };

    /* ---------- CRUD задач ---------- */
    const addTask = async (
        colId: string,
        title: string,
        desc?: string,
        assignedTo?: string,
        deadline?: string,
        priority?: number,
    ) => {
        if (onCreateTask) {
            await onCreateTask(colId, title, desc, assignedTo, deadline, priority);
            return;
        }

        const t = title.trim();
        if (!t) return;

        const newTask: UITask = {
            id: uid(),
            title: t,
            due: deadline,
            priority: priority,
            statuses: undefined,
            assignees: assignedTo ? [{ id: assignedTo, name: assignedTo }] : undefined,
        };

        setLocal(prev =>
            prev.map(c => (c.id === colId ? { ...c, tasks: [...c.tasks, newTask] } : c))
        );
    };

    const removeTask = (colId: string, taskId: string) => {
        if (onDeleteTask) {
            onDeleteTask(taskId);
        } else {
            setLocal(prev =>
                prev.map(c => (c.id === colId ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) } : c))
            );
        }
    };

    /* ---------- DnD (теперь в любую колонку) ---------- */
    const onDropCard = (toColId: string, data: { taskId: string; fromColId: string; toColId: string }) => {
        if (onMoveTask) {
            onMoveTask(data.taskId, toColId);
        } else {
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
        }
    };

    /* ---------- Модалки ---------- */
    const [addOpen, setAddOpen] = useState(false);
    const [rename, setRename] = useState<null | { id: string; title: string }>(null);
    const [addTaskFor, setAddTaskFor] = useState<null | string>(null);
    const [editTask, setEditTask] = useState<null | { taskId: string; colId: string }>(null);
    const canAddColumn = local.length >= 2;
    const handleOpenAddColumn = useCallback(() => setAddOpen(true), []);

    useEffect(() => {
        if (onHeaderStateChange) {
            onHeaderStateChange({
                openAddColumn: handleOpenAddColumn,
                canAdd: canAddColumn,
                isCreating: isCreatingStatus,
            });
        }
    }, [onHeaderStateChange, handleOpenAddColumn, canAddColumn, isCreatingStatus]);

    return (
        <div className="flex flex-col gap-4 " style={{ height: `calc(100dvh - ${viewportOffset}px)` }}>
            {!hideHeader && (
                <KanbanHeader
                    canAdd={canAddColumn}
                    onAddColumn={handleOpenAddColumn}
                    isCreating={isCreatingStatus}
                />
            )}

            <div className="flex-1 min-h-0 overflow-x-auto custom-scroll">
                <div className="flex h-full items-stretch gap-3 pb-2 min-h-0">
                    {local.map((col, index) => (
                        <Column
                            key={col.id}
                            column={col}
                            onDrop={(payload) => onDropCard(col.id, payload)}
                            onAddTask={() => setAddTaskFor(col.id)}
                            onRename={() => setRename({ id: col.id, title: col.title })}
                            onRemove={() => removeColumn(col.id)}
                            onRemoveTask={(taskId) => removeTask(col.id, taskId)}
                            onEditTask={(taskId) => setEditTask({ taskId, colId: col.id })}
                            isDeleting={isDeletingStatus}
                            isCreatingTask={isCreatingTask}
                            isDeletingTask={isDeletingTask}
                            canEdit={index > 0 && index < local.length - 1}
                            showActions={showColumnActions}
                        />
                    ))}
                </div>
            </div>

            {/* модалки */}
            <AddStatusModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                columns={local}
                onSubmit={(betweenIndex, title, color) => insertBetween(betweenIndex, title, color)}
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
                isSubmitting={isCreatingTask}
                onCreate={async (title, desc, assignedTo, deadline, priority) => {
                    if (!addTaskFor) return;
                    await addTask(addTaskFor, title, desc, assignedTo, deadline, priority);
                }}
            />

            <EditTaskModal
                open={!!editTask}
                onClose={() => setEditTask(null)}
                task={editTask ? local.find(col => col.id === editTask.colId)?.tasks.find(t => t.id === editTask.taskId) || null : null}
                isSubmitting={isUpdatingTask}
                onUpdate={async (title, desc, assignedTo, deadline, priority) => {
                    if (editTask && onUpdateTask) {
                        await onUpdateTask(editTask.taskId, title, desc, assignedTo, deadline, priority);
                    }
                }}
            />
        </div>
    );
}
// 'use client';
//
// import { useCallback, useEffect, useMemo, useState } from 'react';
// import KanbanHeader from './KanbanHeader';
// import Column from './Column';
// import AddStatusModal from './modals/AddStatusModal';
// import RenameColumnModal from './modals/RenameColumnModal';
// import AddTaskModal from './modals/AddTaskModal';
// import EditTaskModal from './modals/EditTaskModal';
// import { KBColumn } from './types';
// import { uid } from '@/lib/uid';
// import { type UITask } from '@/features/tasks/types';
//
// export default function KanbanBoard({
//                                         columns,
//                                         onChange,
//                                         viewportOffset = 160,
//                                         onCreateStatus,
//                                         isCreatingStatus = false,
//                                         onDeleteStatus,
//                                         isDeletingStatus = false,
//                                         onCreateTask,
//                                         isCreatingTask = false,
//                                         onUpdateTask,
//                                         isUpdatingTask = false,
//                                         onDeleteTask,
//                                         isDeletingTask = false,
//                                         onMoveTask,
//                                         isMovingTask = false,
//                                         hideHeader = false,
//                                         onHeaderStateChange,
//                                         showColumnActions = false,
//                                     }: {
//     columns: KBColumn[];
//     onChange: (cols: KBColumn[]) => void;
//     viewportOffset?: number;
//     onCreateStatus?: (betweenIndex: number, title: string, color: string) => void;
//     isCreatingStatus?: boolean;
//     onDeleteStatus?: (statusId: string) => void;
//     isDeletingStatus?: boolean;
//     onCreateTask?: (
//         statusId: string,
//         title: string,
//         description?: string,
//         assignedTo?: string,
//         deadline?: string,
//         priority?: number,
//     ) => Promise<void>;
//     isCreatingTask?: boolean;
//     onUpdateTask?: (
//         taskId: string,
//         title: string,
//         description?: string,
//         assignedTo?: string,
//         deadline?: string,
//         priority?: number,
//     ) => Promise<void>;
//     isUpdatingTask?: boolean;
//     onDeleteTask?: (taskId: string) => void;
//     isDeletingTask?: boolean;
//     onMoveTask?: (taskId: string, statusId: string) => void;
//     isMovingTask?: boolean;
//     hideHeader?: boolean;
//     onHeaderStateChange?: (state: { openAddColumn: () => void; canAdd: boolean; isCreating: boolean }) => void;
//     showColumnActions?: boolean;
// }) {
//     const [local, setLocal] = useState<KBColumn[]>(columns);
//     useEffect(() => setLocal(columns), [columns]);
//     useEffect(() => onChange(local), [local, onChange]);
//
//     const colIndex = useMemo(
//         () => Object.fromEntries(local.map((c, i) => [c.id, i])) as Record<string, number>,
//         [local]
//     );
//
//     /* ---------- CRUD колонок ---------- */
//     // вставка только между: index ∈ [1..len-1]
//     const insertBetween = (betweenIndex: number, title: string, color: string) => {
//         if (onCreateStatus) {
//             // Используем API для создания статуса
//             onCreateStatus(betweenIndex, title, color);
//         } else {
//             // Fallback для локального создания (если API не передан)
//             const t = title.trim(); if (!t || local.length < 2) return;
//             const at = Math.max(1, Math.min(betweenIndex, local.length - 1));
//             setLocal(prev => {
//                 const copy = [...prev];
//                 copy.splice(at, 0, { id: uid(), title: t, tasks: [], color });
//                 return copy;
//             });
//         }
//     };
//
//     const renameColumn = (id: string, title: string) => {
//         const t = title.trim(); if (!t) return;
//         setLocal(prev => prev.map(c => (c.id === id ? { ...c, title: t } : c)));
//     };
//
//     const removeColumn = (id: string) => {
//         if (onDeleteStatus) {
//             // Используем API для удаления статуса
//             onDeleteStatus(id);
//         } else {
//             // Fallback для локального удаления (если API не передан)
//             setLocal(prev => prev.filter(c => c.id !== id));
//         }
//     };
//
//     /* ---------- CRUD задач ---------- */
//     const addTask = async (
//         colId: string,
//         title: string,
//         desc?: string,
//         assignedTo?: string,
//         deadline?: string,
//         priority?: number,
//     ) => {
//         if (onCreateTask) {
//             await onCreateTask(colId, title, desc, assignedTo, deadline, priority);
//             return;
//         }
//
//         const t = title.trim();
//         if (!t) return;
//
//         const newTask: UITask = {
//             id: uid(),
//             title: t,
//             due: deadline,
//             priority: priority,
//             statuses: undefined,
//             assignees: assignedTo ? [{ id: assignedTo, name: assignedTo }] : undefined,
//         };
//
//         setLocal(prev =>
//             prev.map(c => (c.id === colId ? { ...c, tasks: [...c.tasks, newTask] } : c))
//         );
//     };
//     const removeTask = (colId: string, taskId: string) => {
//         if (onDeleteTask) {
//             // Используем API для удаления задачи
//             onDeleteTask(taskId);
//         } else {
//             // Fallback для локального удаления (если API не передан)
//             setLocal(prev =>
//                 prev.map(c => (c.id === colId ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) } : c))
//             );
//         }
//     };
//
//     /* ---------- DnD (только в соседнюю) ---------- */
//     const onDropCard = (toColId: string, data: { taskId: string; fromColId: string }) => {
//         const fromI = colIndex[data.fromColId];
//         const toI = colIndex[toColId];
//         if (fromI == null || toI == null) return;
//         if (Math.abs(fromI - toI) > 1) return;
//
//         if (onMoveTask) {
//             // Используем API для перемещения задачи
//             onMoveTask(data.taskId, toColId);
//         } else {
//             // Fallback для локального перемещения (если API не передан)
//             setLocal(prev => {
//                 const cols = prev.map(c => ({ ...c, tasks: [...c.tasks] }));
//                 const from = cols.find(c => c.id === data.fromColId)!;
//                 const to = cols.find(c => c.id === toColId)!;
//                 const idx = from.tasks.findIndex(t => t.id === data.taskId);
//                 if (idx === -1) return prev;
//                 const [moved] = from.tasks.splice(idx, 1);
//                 to.tasks.push(moved);
//                 return cols;
//             });
//         }
//     };
//
//     /* ---------- Модалки ---------- */
//     const [addOpen, setAddOpen] = useState(false);
//     const [rename, setRename] = useState<null | { id: string; title: string }>(null);
//     const [addTaskFor, setAddTaskFor] = useState<null | string>(null);
//     const [editTask, setEditTask] = useState<null | { taskId: string; colId: string }>(null);
//     const canAddColumn = local.length >= 2;
//     const handleOpenAddColumn = useCallback(() => setAddOpen(true), []);
//
//     useEffect(() => {
//         if (onHeaderStateChange) {
//             onHeaderStateChange({
//                 openAddColumn: handleOpenAddColumn,
//                 canAdd: canAddColumn,
//                 isCreating: isCreatingStatus,
//             });
//         }
//     }, [onHeaderStateChange, handleOpenAddColumn, canAddColumn, isCreatingStatus]);
//
//     return (
//         <div className="flex flex-col gap-4 " style={{ height: `calc(100dvh - ${viewportOffset}px)` }}>
//             {!hideHeader && (
//                 <KanbanHeader
//                     canAdd={canAddColumn}
//                     onAddColumn={handleOpenAddColumn}
//                     isCreating={isCreatingStatus}
//                 />
//             )}
//
//             <div className="flex-1 min-h-0 overflow-x-auto custom-scroll">
//                 <div className="flex h-full items-stretch gap-3 pb-2 min-h-0">
//                     {local.map((col, index) => (
//                         <Column
//                             key={col.id}
//                             column={col}
//                             onDrop={(payload) => onDropCard(col.id, payload)}
//                             onAddTask={() => setAddTaskFor(col.id)}
//                             onRename={() => setRename({ id: col.id, title: col.title })}
//                             onRemove={() => removeColumn(col.id)}
//                             onRemoveTask={(taskId) => removeTask(col.id, taskId)}
//                             onEditTask={(taskId) => setEditTask({ taskId, colId: col.id })}
//                             isDeleting={isDeletingStatus}
//                             isCreatingTask={isCreatingTask}
//                             isDeletingTask={isDeletingTask}
//                             canEdit={index > 0 && index < local.length - 1}
//                             showActions={showColumnActions}
//                         />
//                     ))}
//                 </div>
//             </div>
//
//             {/* модалки */}
//             <AddStatusModal
//                 open={addOpen}
//                 onClose={() => setAddOpen(false)}
//                 columns={local}
//                 onSubmit={(betweenIndex, title, color) => insertBetween(betweenIndex, title, color)}
//             />
//
//             {rename && (
//                 <RenameColumnModal
//                     open
//                     initial={rename.title}
//                     onClose={() => setRename(null)}
//                     onSave={(newTitle) => renameColumn(rename.id, newTitle)}
//                 />
//             )}
//
//             <AddTaskModal
//                 open={!!addTaskFor}
//                 onClose={() => setAddTaskFor(null)}
//                 isSubmitting={isCreatingTask}
//                 onCreate={async (title, desc, assignedTo, deadline, priority) => {
//                     if (!addTaskFor) return;
//                     await addTask(addTaskFor, title, desc, assignedTo, deadline, priority);
//                 }}
//             />
//
//             <EditTaskModal
//                 open={!!editTask}
//                 onClose={() => setEditTask(null)}
//                 task={editTask ? local.find(col => col.id === editTask.colId)?.tasks.find(t => t.id === editTask.taskId) || null : null}
//                 isSubmitting={isUpdatingTask}
//                 onUpdate={async (title, desc, assignedTo, deadline, priority) => {
//                     if (editTask && onUpdateTask) {
//                         await onUpdateTask(editTask.taskId, title, desc, assignedTo, deadline, priority);
//                     }
//                 }}
//             />
//         </div>
//     );
// }
