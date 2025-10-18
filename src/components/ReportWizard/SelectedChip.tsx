'use client';
import Avatar from '@/components/ui/Avatar';
import TrashIcon from '@/components/ui/icons/TrashIcon';
import { Employee } from '@/lib/types';

export default function SelectedChip({ emp, onRemove }:{ emp: Employee; onRemove:()=>void }) {
    const handleRemove = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('SelectedChip: Remove button clicked for:', emp.name);
        onRemove();
    };

    return (
        <div className="group flex items-center gap-2 shrink-0 rounded-full bg-white/10 px-2 py-1 ring-1 ring-white/15">
            <Avatar name={emp.name} url={emp.avatarUrl} email={emp.email} fallbackKey={emp.id} size="sm" />
            <span className="text-slate-100 text-sm">{emp.name}</span>
            <button
                onClick={handleRemove}
                className="ml-1 opacity-100 transition text-slate-300 hover:text-red-300 relative z-10 p-1 rounded hover:bg-red-500/20"
                title="Убрать" 
                aria-label="Убрать"
                type="button"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    );
}
