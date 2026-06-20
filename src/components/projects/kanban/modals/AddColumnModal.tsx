'use client';

import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { ButtonGhost, ButtonPrimary } from '../ui/Buttons';
import { KBColumn } from '../types';

export default function AddColumnModal({
                                           open, onClose, columns, onSubmit,
                                       }: {
    open: boolean;
    onClose: () => void;
    columns: KBColumn[];
    onSubmit: (betweenIndex: number, title: string) => void; // index ∈ [1..len-1]
}) {
    const [title, setTitle] = useState('New');
    const [slotIndex, setSlotIndex] = useState(1);

    useEffect(() => {
        if (open) {
            setTitle('New');
            setSlotIndex(columns.length >= 2 ? 1 : 0);
        }
    }, [open, columns.length]);

    if (!open) return null;

    const thereAreSlots = columns.length >= 2;

    return (
        <Modal
            title="Добавить столбец"
            onClose={onClose}
            footer={
                <>
                    <ButtonGhost onClick={onClose}>Отмена</ButtonGhost>
                    <ButtonPrimary
                        onClick={() => { onSubmit(slotIndex, title); onClose(); }}
                        disabled={!title.trim() || !thereAreSlots}
                    >
                        Добавить
                    </ButtonPrimary>
                </>
            }
        >
            <label className="grid gap-2 mb-4">
                <span className="text-app-2">Название</span>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 rounded-xl backdrop-blur-sm bg-app-hover border border-app hover:bg-app-hover px-4 ring-1 ring-app text-app focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Например, Review"
                />
            </label>

            <div className="text-app-2 mb-2">Выберите место (между столбцами)</div>
            <div className="rounded-2xl backdrop-blur-sm bg-app-hover border border-app text-app ring-1 ring-app p-3 max-h-[50vh] overflow-auto custom-scroll">
                {columns.map((c, i) => (
                    <div key={c.id}>
                        <RowTitle title={c.title} />
                        {i < columns.length - 1 && (
                            <InsertSlot
                                active={slotIndex === i + 1}
                                onSelect={() => setSlotIndex(i + 1)}
                            />
                        )}
                    </div>
                ))}
            </div>
        </Modal>
    );
}

function RowTitle({ title }: { title: string }) {
    return <div className="px-3 py-2 text-app-2">{title}</div>;
}

/** Зелёная полоса-вставка: на hover раздвигается и показывает «Добавить здесь». */
function InsertSlot({
                        active, onSelect,
                    }: { active?: boolean; onSelect: () => void }) {
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
