'use client';

export default function KanbanHeader({
                                         canAdd,
                                         onAddColumn,
                                     }: {
    canAdd: boolean;
    onAddColumn: () => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold text-slate-200">Доска</div>
            <button
                onClick={onAddColumn}
                disabled={!canAdd}
                title={canAdd ? 'Добавить столбец' : 'Добавление доступно, когда есть минимум 2 столбца'}
                className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-2 text-black hover:brightness-110 disabled:opacity-50"
            >
                + Добавить столбец
            </button>
        </div>
    );
}
