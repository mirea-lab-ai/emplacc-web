'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import { ButtonGhost, ButtonPrimary } from '../ui/Buttons';

export default function RenameColumnModal({
                                              open, initial, onClose, onSave,
                                          }: {
    open: boolean;
    initial: string;
    onClose: () => void;
    onSave: (newTitle: string) => void;
}) {
    const [value, setValue] = useState(initial);

    if (!open) return null;

    return (
        <Modal
            title="Переименовать столбец"
            onClose={onClose}
            footer={
                <>
                    <ButtonGhost onClick={onClose}>Отмена</ButtonGhost>
                    <ButtonPrimary onClick={() => { onSave(value.trim()); onClose(); }} disabled={!value.trim()}>
                        Сохранить
                    </ButtonPrimary>
                </>
            }
        >
            <label className="grid gap-2">
                <span className="text-app">Новое название</span>
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-12 rounded-xl backdrop-blur-sm bg-app-hover border border-app px-4 ring-1 ring-app text-app focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
            </label>
        </Modal>
    );
}
