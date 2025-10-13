'use client';

export default function KanbanHeader({
                                         canAdd,
                                         onAddColumn,
                                         isCreating = false,
                                     }: {
    canAdd: boolean;
    onAddColumn: () => void;
    isCreating?: boolean;
}) {
    return (
        <div className="flex items-center justify-between">
            <button
                onClick={onAddColumn}
                disabled={!canAdd || isCreating}
                title={canAdd ? 'Добавить столбец' : 'Добавление доступно, когда есть минимум 2 столбца'}
                className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-2 text-black hover:brightness-110 disabled:opacity-50"
            >
                {isCreating ? 'Создание...' : '+ Добавить столбец'}
            </button>
        </div>
    );
}
