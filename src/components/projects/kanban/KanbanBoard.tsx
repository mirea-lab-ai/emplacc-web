'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import KanbanHeader from './KanbanHeader';
import Column from './Column';
import AddStatusModal from './modals/AddStatusModal';
import RenameColumnModal from './modals/RenameColumnModal';
import AddTaskModal from './modals/AddTaskModal';
import EditTaskModal from './modals/EditTaskModal';
import { uid } from '@/lib/uid';
import { type KBColumn } from './types';
import { type UITask } from '@/features/tasks/types';

type HeaderState = {
  openAddColumn: () => void;
  canAdd: boolean;
  isCreating: boolean;
};

type Props = {
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
  onHeaderStateChange?: (state: HeaderState) => void;
  showColumnActions?: boolean;
  readOnly?: boolean;
};

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
  readOnly = false,
}: Props) {
  const [local, setLocal] = useState<KBColumn[]>(columns);

  useEffect(() => setLocal(columns), [columns]);

  useEffect(() => {
    if (readOnly) return;
    onChange(local);
  }, [local, onChange, readOnly]);

  const columnIndex = useMemo(
    () => Object.fromEntries(local.map((column, index) => [column.id, index])) as Record<string, number>,
    [local],
  );

  const insertBetween = (betweenIndex: number, title: string, color: string) => {
    if (readOnly) return;
    if (onCreateStatus) {
      onCreateStatus(betweenIndex, title, color);
      return;
    }

    const trimmed = title.trim();
    if (!trimmed || local.length < 2) return;

    const at = Math.max(1, Math.min(betweenIndex, local.length - 1));
    setLocal((prev) => {
      const copy = [...prev];
      copy.splice(at, 0, { id: uid(), title: trimmed, tasks: [], color });
      return copy;
    });
  };

  const renameColumn = (id: string, title: string) => {
    if (readOnly) return;
    const trimmed = title.trim();
    if (!trimmed) return;

    setLocal((prev) => prev.map((column) => (column.id === id ? { ...column, title: trimmed } : column)));
  };

  const removeColumn = (id: string) => {
    if (readOnly) return;
    if (onDeleteStatus) {
      onDeleteStatus(id);
      return;
    }

    setLocal((prev) => prev.filter((column) => column.id !== id));
  };

  const addTask = async (
    colId: string,
    title: string,
    desc?: string,
    assignedTo?: string,
    deadline?: string,
    priority?: number,
  ) => {
    if (readOnly) return;
    if (onCreateTask) {
      await onCreateTask(colId, title, desc, assignedTo, deadline, priority);
      return;
    }

    const trimmed = title.trim();
    if (!trimmed) return;

    const task: UITask = {
      id: uid(),
      title: trimmed,
      description: desc?.trim() || undefined,
      due: deadline,
      priority,
      assignees: assignedTo ? [{ id: assignedTo, name: assignedTo }] : undefined,
    };

    setLocal((prev) =>
      prev.map((column) => (column.id === colId ? { ...column, tasks: [...column.tasks, task] } : column)),
    );
  };

  const removeTask = (colId: string, taskId: string) => {
    if (readOnly) return;
    if (onDeleteTask) {
      onDeleteTask(taskId);
      return;
    }

    setLocal((prev) =>
      prev.map((column) =>
        column.id === colId
          ? { ...column, tasks: column.tasks.filter((task) => task.id !== taskId) }
          : column,
      ),
    );
  };

  const moveTaskLocally = (taskId: string, fromColId: string, toColId: string) => {
    setLocal((prev) => {
      const copy = prev.map((column) => ({ ...column, tasks: [...column.tasks] }));
      const fromColumn = copy.find((column) => column.id === fromColId);
      const toColumn = copy.find((column) => column.id === toColId);
      if (!fromColumn || !toColumn) return prev;

      const index = fromColumn.tasks.findIndex((task) => task.id === taskId);
      if (index === -1) return prev;

      const [moved] = fromColumn.tasks.splice(index, 1);
      toColumn.tasks.push(moved);
      return copy;
    });
  };

  const onDropCard = (toColId: string, payload: { taskId: string; fromColId: string }) => {
    if (readOnly) return;
    if (!payload?.taskId || !payload?.fromColId) return;
    if (payload.fromColId === toColId) return;

    const fromIndex = columnIndex[payload.fromColId];
    const toIndex = columnIndex[toColId];
    if (fromIndex == null || toIndex == null) return;

    if (onMoveTask) {
      onMoveTask(payload.taskId, toColId);
      return;
    }

    moveTaskLocally(payload.taskId, payload.fromColId, toColId);
  };

  const updateTaskLocally = (
    taskId: string,
    colId: string,
    title: string,
    description?: string,
    assignedTo?: string,
    deadline?: string,
    priority?: number,
  ) => {
    setLocal((prev) =>
      prev.map((column) =>
        column.id === colId
          ? {
              ...column,
              tasks: column.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      title: title.trim() || task.title,
                      description: description?.trim() || undefined,
                      due: deadline,
                      priority,
                      assignees: assignedTo ? [{ id: assignedTo, name: assignedTo }] : task.assignees,
                    }
                  : task,
              ),
            }
          : column,
      ),
    );
  };

  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<null | { id: string; title: string }>(null);
  const [addTaskFor, setAddTaskFor] = useState<null | string>(null);
  const [editTask, setEditTask] = useState<null | { taskId: string; colId: string }>(null);

  const canAddColumn = local.length >= 2;

  const handleOpenAddColumn = useCallback(() => {
    if (readOnly) return;
    setAddColumnOpen(true);
  }, [readOnly]);

  useEffect(() => {
    if (!readOnly) return;
    setAddColumnOpen(false);
    setRenameTarget(null);
    setAddTaskFor(null);
    setEditTask(null);
  }, [readOnly]);

  useEffect(() => {
    if (!onHeaderStateChange) return;
    onHeaderStateChange({
      openAddColumn: handleOpenAddColumn,
      canAdd: canAddColumn,
      isCreating: isCreatingStatus,
    });
  }, [onHeaderStateChange, handleOpenAddColumn, canAddColumn, isCreatingStatus]);

  const addStatusModal = (
    <AddStatusModal
      open={addColumnOpen}
      onClose={() => setAddColumnOpen(false)}
      columns={local}
      onSubmit={(betweenIndex, title, color) => insertBetween(betweenIndex, title, color)}
    />
  );

  const renameModal = (
    <RenameColumnModal
      open
      initial={renameTarget?.title ?? ''}
      onClose={() => setRenameTarget(null)}
      onSave={(newTitle) => renameTarget && renameColumn(renameTarget.id, newTitle)}
    />
  );

  const addTaskModal = (
    <AddTaskModal
      open={!!addTaskFor}
      onClose={() => setAddTaskFor(null)}
      isSubmitting={isCreatingTask}
      onCreate={async (title, desc, assignedTo, deadline, priority) => {
        if (!addTaskFor) return;
        await addTask(addTaskFor, title, desc, assignedTo, deadline, priority);
      }}
    />
  );

  const editTaskModal = (
    <EditTaskModal
      open={!!editTask}
      onClose={() => setEditTask(null)}
      task={
        editTask
          ? local.find((column) => column.id === editTask.colId)?.tasks.find((task) => task.id === editTask.taskId) ??
            null
          : null
      }
      isSubmitting={isUpdatingTask}
      onUpdate={async (title, desc, assignedTo, deadline, priority) => {
        if (!editTask) return;
        if (onUpdateTask) {
          await onUpdateTask(editTask.taskId, title, desc, assignedTo, deadline, priority);
        } else {
          updateTaskLocally(editTask.taskId, editTask.colId, title, desc, assignedTo, deadline, priority);
        }
      }}
    />
  );

  return (
    <div className="flex flex-col gap-4" style={{ height: `calc(100dvh - ${viewportOffset}px)` }}>
      {!hideHeader && !readOnly && (
        <KanbanHeader canAdd={canAddColumn} onAddColumn={handleOpenAddColumn} isCreating={isCreatingStatus} />
      )}

      <div className="flex-1 min-h-0 overflow-x-auto custom-scroll">
        <div className="flex h-full items-stretch gap-3 pb-2">
          {local.map((column, index) => (
            <Column
              key={column.id}
              column={column}
              onDrop={(payload) => onDropCard(column.id, payload)}
              onAddTask={() => {
                if (readOnly) return;
                setAddTaskFor(column.id);
              }}
              onRename={() => setRenameTarget({ id: column.id, title: column.title })}
              onRemove={() => removeColumn(column.id)}
              onRemoveTask={(taskId) => removeTask(column.id, taskId)}
              onEditTask={(taskId) => setEditTask({ taskId, colId: column.id })}
              isDeleting={isDeletingStatus}
              isCreatingTask={isCreatingTask}
              isDeletingTask={isDeletingTask}
              canEdit={index > 0 && index < local.length - 1}
              showActions={showColumnActions && !readOnly}
              readOnly={readOnly}
              isMovingTask={isMovingTask}
            />
          ))}
        </div>
      </div>

      {!readOnly && (
        <>
          {addStatusModal}
          {renameTarget && renameModal}
          {addTaskModal}
          {editTaskModal}
        </>
      )}
    </div>
  );
}
