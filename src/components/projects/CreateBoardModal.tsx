// src/components/projects/CreateBoardModal.tsx
'use client';

import { useState } from 'react';
import { useCreateBoard } from '@/features/boards/hooks';
import { useToast } from '@/components/ui/Toast';

type Props = {
    projectId: string;
    onClose: () => void;
};

export default function CreateBoardModal({ projectId, onClose }: Props) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const { mutate: create, isPending } = useCreateBoard();
    const toast = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        create(
            { 
                name: name.trim(), 
                description: description.trim() || undefined,
                project_id: projectId,
            },
            {
                onSuccess: () => {
                    onClose();
                },
                onError: (err) => {
                    console.error('Failed to create board:', err);
                    toast.error('Не удалось создать доску');
                },
            }
        );
    };

    return (
        <div 
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-xl border border-app t-surface-elevated p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-4 text-xl font-semibold text-app">Создать доску</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm text-app-2">
                            Название доски*
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border border-app bg-app-subtle px-3 py-2 text-app placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                            placeholder="Введите название"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-app-2">
                            Описание
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded-lg border border-app bg-app-subtle px-3 py-2 text-app placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
                            placeholder="Опишите цель доски"
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPending}
                            className="flex-1 rounded-lg border border-app px-4 py-2 text-app hover:bg-app-hover transition-colors disabled:opacity-50"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !name.trim()}
                            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? 'Создаём...' : 'Создать'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

