'use client';

import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { ButtonGhost, ButtonPrimary } from '../ui/Buttons';
import { KBColumn } from '../types';
import ColorPalette from '../ColorPalette';

export default function AddStatusModal({
    open,
    onClose,
    columns,
    onSubmit,
}: {
    open: boolean;
    onClose: () => void;
    columns: KBColumn[];
    onSubmit: (betweenIndex: number, title: string, color: string) => void;
}) {
    const [title, setTitle] = useState('New');
    const [slotIndex, setSlotIndex] = useState(1);
    const [selectedColor, setSelectedColor] = useState('#3B82F6');

    useEffect(() => {
        if (open) {
            setTitle('New');
            setSlotIndex(columns.length >= 2 ? 1 : 0);
            setSelectedColor('#3B82F6');
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
                        onClick={() => { onSubmit(slotIndex, title, selectedColor); onClose(); }}
                        disabled={!title.trim() || !thereAreSlots}
                    >
                        Добавить
                    </ButtonPrimary>
                </>
            }
        >
            <div className="max-h-[60vh] overflow-y-auto custom-scroll space-y-6">
                <label className="grid gap-2">
                    <span className="text-slate-200">Название</span>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Например, Review"
                    />
                </label>

                <ColorPalette selectedColor={selectedColor} onColorSelect={setSelectedColor} />

                <div>
                    <div className="text-slate-200 mb-2">Выберите место (между столбцами)</div>
                    <div className="rounded-2xl backdrop-blur-sm bg-white/10 border border-white/20 text-white ring-1 ring-white/10 p-3 max-h-[30vh] overflow-auto custom-scroll">
                        {columns.map((c, i) => (
                            <div key={c.id}>
                                <RowTitle title={c.title} color={c.color} />
                                {i < columns.length - 1 && (
                                    <InsertSlot
                                        active={slotIndex === i + 1}
                                        onSelect={() => setSlotIndex(i + 1)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}

function RowTitle({ title, color }: { title: string; color?: string }) {
    return (
        <div className="px-3 py-2 text-slate-300 flex items-center gap-2">
            {color && (
                <div 
                    className="w-4 h-4 rounded border border-white/20"
                    style={{ backgroundColor: color }}
                />
            )}
            {title}
        </div>
    );
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
