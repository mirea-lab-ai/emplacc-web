// src/features/status/api.ts
import { http } from '@/lib/http';
import { mapTask, type UITask } from '@/features/tasks/types';

export type UIStatus = {
    id: string;
    name: string;
    description?: string;
    order?: number;
    color?: string;
    tasks?: UITask[];
};

export type BoardStatus = {
    boardId: string;
    projectId?: string;
    statuses: UIStatus[];
};

// Получение статусов/колонок доски
export async function fetchBoardStatus(boardId: string): Promise<BoardStatus> {
    const res = await http(`/status/board/${encodeURIComponent(boardId)}`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as any;
    
    // Обработка разных форматов ответа
    const statuses: any[] = Array.isArray(json) 
        ? json 
        : json.statuses ?? json.columns ?? [];
    
    return {
        boardId,
        projectId: json.project_id,
        statuses: statuses.map((s: any) => ({
            id: String(s.id ?? ''),
            name: s.name ?? 'Без названия',
            description: s.description,
            order: s.order ?? s.position ?? 0,
            color: s.color ?? '#3B82F6',
            tasks: Array.isArray(s.tasks) ? s.tasks.map(mapTask) : [],
        })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    };
}

export type CreateStatusRequest = {
    name: string;
    color: string;
    board_id?: string;
    order?: number;
    is_active?: boolean;
    is_default?: boolean;
    is_open?: boolean;
};

export type CreateStatusResponse = {
    id: string;
    name: string;
    color: string;
    order: number;
    board_id: string;
    is_active: boolean;
    is_default: boolean;
    is_open: boolean;
};

// Создание нового статуса
export async function createStatus(payload: CreateStatusRequest): Promise<CreateStatusResponse> {
    const res = await http('/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as any;
    
    return {
        id: String(json.id ?? ''),
        name: json.name ?? '',
        color: json.color ?? '#3B82F6',
        order: json.order ?? 0,
        board_id: json.board_id ?? '',
        is_active: json.is_active ?? true,
        is_default: json.is_default ?? false,
        is_open: json.is_open ?? true,
    };
}

// Удаление статуса
export async function deleteStatus(statusId: string): Promise<void> {
    const res = await http(`/status/${encodeURIComponent(statusId)}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

