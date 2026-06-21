import { type UITask } from '@/features/tasks/types';

export type KBTask   = { id: string; title: string; desc?: string };
export type KBColumn = { id: string; title: string; tasks: UITask[]; color?: string; order?: number; isOpen?: boolean };
