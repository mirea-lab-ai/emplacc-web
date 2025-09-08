'use client';

import Panel from '@/components/ui/Panel';
import { useEffect, useMemo, useState } from 'react';

export type KBTask = { id: string; title: string; desc?: string };
export type KBColumn = { id: string; title: string; tasks: KBTask[] };

export default function KanbanBoard({
                                      columns,
                                      onChange,
                                      viewportOffset = 160, // учти высоту хэдера
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
  // Вставка разрешена ТОЛЬКО между колонками (индексы 1..len-1)
  const insertColumnBetween = (betweenIndex: number, title: string) => {
    const t = title.trim();
    if (!t || local.length < 2) return;
    const at = Math.max(1, Math.min(betweenIndex, local.length - 1));
    setLocal(prev => {
      const copy = [...prev];
      copy.splice(at, 0, { id: uid(), title: t, tasks: [] });
      return copy;
    });
  };

  const renameColumn = (id: string, title: string) => {
    const t = title.trim();
    if (!t) return;
    setLocal(prev => prev.map(c => (c.id === id ? { ...c, title: t } : c)));
  };

  const removeColumn = (id: string) => {
    setLocal(prev => prev.filter(c => c.id !== id));
  };

  /* ---------- CRUD задач ---------- */
  const addTask = (colId: string, title: string, desc?: string) => {
    const t = title.trim();
    if (!t) return;
    setLocal(prev =>
      prev.map(c => (c.id === colId ? { ...c, tasks: [...c.tasks, { id: uid(), title: t, desc }] } : c))
    );
  };
  const removeTask = (colId: string, taskId: string) => {
    setLocal(prev =>
      prev.map(c => (c.id === colId ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) } : c))
    );
  };

  /* ---------- DnD (только в соседнюю колонку) ---------- */
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
  // Добавление колонки (через список и зелёные слоты между названиями)
  const [addColOpen, setAddColOpen] = useState(false);
  const [addColTitle, setAddColTitle] = useState('New');
  const [slotIndex, setSlotIndex] = useState(1); // индекс "между" (1..len-1)

  useEffect(() => {
    if (addColOpen) {
      setAddColTitle('New');
      // по умолчанию — первый доступный между 1..len-1
      setSlotIndex(local.length >= 2 ? 1 : 0);
    }
  }, [addColOpen, local.length]);

  // Переименование
  const [renameOpen, setRenameOpen] = useState<null | { id: string; value: string }>(null);

  // Добавить задачу
  const [addTaskFor, setAddTaskFor] = useState<null | string>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');

  const thereAreSlots = local.length >= 2; // иначе «между» выбрать негде

  return (
    <div className="flex flex-col gap-4" style={{ height: `calc(100dvh - ${viewportOffset}px)` }}>
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-200">Доска</div>
        <button
          onClick={() => setAddColOpen(true)}
          className="rounded-xl bg-[#2b3681] px-4 py-2 text-slate-200 hover:brightness-110 disabled:opacity-50"
          disabled={!thereAreSlots} // нельзя, если меньше 2 колонок
          title={thereAreSlots ? 'Добавить столбец' : 'Добавление доступно, когда есть минимум 2 столбца'}
        >
          + Добавить столбец
        </button>
      </div>

      {/* Колонки */}
      <div className="flex-1 overflow-x-auto custom-scroll">
        <div className="flex items-start gap-4 pb-2 min-h-0">
          {local.map((col) => (
            <Column
              key={col.id}
              column={col}
              onDrop={(payload) => onDropCard(col.id, payload)}
              onAddTask={() => {
                setAddTaskFor(col.id);
                setTaskTitle('');
                setTaskDesc('');
              }}
              onRename={() => setRenameOpen({ id: col.id, value: col.title })}
              onRemove={() => removeColumn(col.id)}
              onRemoveTask={(taskId) => removeTask(col.id, taskId)}
            />
          ))}
        </div>
      </div>

      {/* -------- Модалка: Добавить столбец (слоты зелёные, только между) -------- */}
      {addColOpen && (
        <Modal onClose={() => setAddColOpen(false)} title="Добавить столбец">
          <label className="grid gap-2 mb-4">
            <span className="text-slate-200">Название</span>
            <input
              value={addColTitle}
              onChange={(e) => setAddColTitle(e.target.value)}
              className="h-12 rounded-xl bg-[#141c2f] px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Например, Review"
            />
          </label>

          <div className="text-slate-200 mb-2">Выберите место (между столбцами)</div>
          <div className="rounded-2xl bg-[#141c2f] ring-1 ring-white/10 p-3 max-h-[50vh] overflow-auto custom-scroll">
            {local.map((c, i) => (
              <div key={c.id}>
                <RowTitle title={c.title} />
                {/* показываем слот ТОЛЬКО если он не первый и не последний */}
                {i < local.length - 1 && (
                  <InsertSlot
                    active={slotIndex === i + 1}
                    onSelect={() => setSlotIndex(i + 1)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <ButtonGhost onClick={() => setAddColOpen(false)}>Отмена</ButtonGhost>
            <ButtonPrimary
              onClick={() => {
                insertColumnBetween(slotIndex, addColTitle);
                setAddColOpen(false);
              }}
              disabled={!addColTitle.trim() || !thereAreSlots}
            >
              Добавить
            </ButtonPrimary>
          </div>
        </Modal>
      )}

      {/* -------- Модалка: Переименовать столбец -------- */}
      {renameOpen && (
        <Modal onClose={() => setRenameOpen(null)} title="Переименовать столбец">
          <label className="grid gap-2">
            <span className="text-slate-200">Новое название</span>
            <input
              value={renameOpen.value}
              onChange={(e) => setRenameOpen({ ...renameOpen, value: e.target.value })}
              className="h-12 rounded-xl bg-[#141c2f] px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </label>

          <div className="mt-6 flex justify-end gap-3">
            <ButtonGhost onClick={() => setRenameOpen(null)}>Отмена</ButtonGhost>
            <ButtonPrimary
              onClick={() => {
                renameColumn(renameOpen.id, renameOpen.value);
                setRenameOpen(null);
              }}
              disabled={!renameOpen.value.trim()}
            >
              Сохранить
            </ButtonPrimary>
          </div>
        </Modal>
      )}

      {/* -------- Модалка: Новая задача -------- */}
      {addTaskFor && (
        <Modal onClose={() => setAddTaskFor(null)} title="Новая задача">
          <label className="grid gap-2 mb-3">
            <span className="text-slate-200">Название</span>
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="h-12 rounded-xl bg-[#141c2f] px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Например, Сделать поиск"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-slate-200">Описание (необязательно)</span>
            <textarea
              rows={5}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="rounded-xl bg-[#141c2f] px-4 py-3 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Кратко опишите детали задачи…"
            />
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <ButtonGhost onClick={() => setAddTaskFor(null)}>Отмена</ButtonGhost>
            <ButtonPrimary
              onClick={() => {
                addTask(addTaskFor, taskTitle, taskDesc);
                setAddTaskFor(null);
              }}
              disabled={!taskTitle.trim()}
            >
              Добавить
            </ButtonPrimary>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================== Колонка и карточки ================== */

function Column({
                  column,
                  onAddTask,
                  onDrop,
                  onRename,
                  onRemove,
                  onRemoveTask,
                }: {
  column: KBColumn;
  onAddTask: () => void;
  onDrop: (payload: { taskId: string; fromColId: string }) => void;
  onRename: () => void;
  onRemove: () => void;
  onRemoveTask: (taskId: string) => void;
}) {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as {
        taskId: string;
        fromColId: string;
      };
      if (data?.taskId && data?.fromColId) onDrop(data);
    } catch {}
  };

  return (
    <Panel
      className="group shrink-0 w-[320px] p-3"
      onDragOver={(e: React.DragEvent) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">
          <span className="align-middle">{column.title}</span>
          <button
            onClick={onRename}
            className="ml-2 align-middle opacity-0 group-hover:opacity-100 transition rounded-md p-1 ring-1 ring-white/10 hover:bg-[#2b3681]/60"
            title="Переименовать"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20h9" />
              <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddTask}
            className="rounded-xl bg-[#2b3681] px-3 py-1.5 text-slate-200 hover:brightness-110 text-sm"
          >
            + Задача
          </button>
          <button
            onClick={onRemove}
            className="rounded-md p-1 ring-1 ring-white/10 hover:bg-[#ef4657]/25 hover:text-white hover:ring-[#ef4657]/40 transition"
            title="Удалить колонку"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[calc(100dvh-260px)] overflow-auto pr-1 custom-scroll">
        {column.tasks.map((t) => (
          <Card key={t.id} task={t} fromColId={column.id} onRemove={() => onRemoveTask(t.id)} />
        ))}
      </div>
    </Panel>
  );
}

function Card({
                task,
                fromColId,
                onRemove,
              }: {
  task: KBTask;
  fromColId: string;
  onRemove: () => void;
}) {
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, fromColId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group relative rounded-xl bg-[#141c2f] ring-1 ring-white/10 px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[#16213a]"
      title="Перетащите в соседнюю колонку"
    >
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 hidden group-hover:inline-flex rounded-md p-1 ring-1 ring-white/10 hover:bg-[#ef4657]/25 hover:text-white hover:ring-[#ef4657]/40 transition"
        title="Удалить задачу"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>

      <div className="font-medium">{task.title}</div>
      {task.desc && <div className="text-slate-400 text-sm">{task.desc}</div>}
    </div>
  );
}

/* ================== Вспомогательные UI ================== */

function Modal({
                 title,
                 onClose,
                 children,
               }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#111829] p-6 ring-1 ring-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-slate-300 hover:text-white"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ButtonPrimary({
                         children,
                         onClick,
                         disabled,
                       }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-[#22c55e] px-5 py-2 font-semibold text-white hover:brightness-110 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
function ButtonGhost({
                       children,
                       onClick,
                     }: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="rounded-lg px-4 py-2 text-slate-300 hover:text-white">
      {children}
    </button>
  );
}

function RowTitle({ title }: { title: string }) {
  return <div className="px-3 py-2 text-slate-300">{title}</div>;
}

/** Зелёный слот вставки. На hover увеличивается и показывает «Добавить здесь». */
function InsertSlot({
                      active,
                      onSelect,
                    }: {
  active?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        'w-full my-2 rounded-xl bg-emerald-600/60 ring-1 ring-emerald-400/40 text-emerald-50',
        'transition-all overflow-hidden',
        active ? 'h-10' : 'h-2 hover:h-10',
      ].join(' ')}
    >
      <div className={['h-full grid place-items-center text-xs', active ? 'opacity-100' : 'opacity-0 hover:opacity-100'].join(' ')}>
        Добавить здесь
      </div>
    </button>
  );
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
