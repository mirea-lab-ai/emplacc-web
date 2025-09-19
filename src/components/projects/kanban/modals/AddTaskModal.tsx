'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import { ButtonGhost, ButtonPrimary } from '../ui/Buttons';

export default function AddTaskModal({
                                         open, onClose, onCreate,
                                     }: {
    open: boolean;
    onClose: () => void;
    onCreate: (title: string, desc?: string) => void;
}) {
    const [title, setTitle] = useState('');
    const [desc, setDesc]   = useState('');

    if (!open) return null;

    return (
        <Modal
            title="Новая задача"
            onClose={onClose}
            footer={
                <>
                    <ButtonGhost onClick={onClose}>Отмена</ButtonGhost>
                    <ButtonPrimary
                        onClick={() => { onCreate(title.trim(), desc.trim() || undefined); onClose(); }}
                        disabled={!title.trim()}
                    >
                        Добавить
                    </ButtonPrimary>
                </>
            }
        >
            <label className="grid gap-2 mb-3">
                <span className="text-slate-200">Название</span>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Например, Сделать поиск"
                />
            </label>
            <label className="grid gap-2">
                <span className="text-slate-200">Описание (необязательно)</span>
                <textarea
                    rows={5}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 py-3 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Кратко опишите детали задачи…"
                />
            </label>
        </Modal>
    );
}
