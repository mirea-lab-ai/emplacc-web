'use client';
import Avatar from '@/components/ui/Avatar';
import TrashIcon from '@/components/ui/icons/TrashIcon';
import { Employee } from '@/lib/types';

export default function SelectedChip({ emp, onRemove }:{ emp: Employee; onRemove:()=>void }) {
    return (
        <div className="group flex items-center gap-2 shrink-0 rounded-full bg-white/10 px-2 py-1 ring-1 ring-white/15">
            <Avatar name={emp.name} url={emp.avatarUrl} size="sm" />
            <span className="text-slate-100 text-sm">{emp.name}</span>
            <button
                onClick={onRemove}
                className="ml-1 opacity-0 group-hover:opacity-100 transition text-slate-300 hover:text-red-300"
                title="Убрать" aria-label="Убрать"
            >
                <TrashIcon />
            </button>
        </div>
    );
}
