// src/features/boards/api.ts
import { http } from '@/lib/http';

export type UIBoard = {
    id: string;
    name: string;
    description?: string;
    projectId: string;
};

export type CreateBoardRequest = {
    name: string;
    description?: string;
    project_id: string;
};

// Получение досок проекта
export async function fetchProjectBoards(projectId: string): Promise<UIBoard[]> {
    const res = await http(`/boards/project/${encodeURIComponent(projectId)}`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as any;
    
    // Обработка разных форматов ответа
    const list: any[] = Array.isArray(json) 
        ? json 
        : json.boards ?? [];
    
    return list.map((b: any) => ({
        id: String(b.id ?? ''),
        name: b.name ?? 'Без названия',
        description: b.description,
        projectId: b.project_id ?? projectId,
    }));
}

// Создание новой доски
export async function createBoard(payload: CreateBoardRequest): Promise<UIBoard> {
    const res = await http('/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as any;
    
    return {
        id: String(json.id ?? ''),
        name: payload.name,
        description: payload.description,
        projectId: payload.project_id,
    };
}

// Удаление доски
export async function deleteBoard(boardId: string): Promise<void> {
    const res = await http(`/boards/${encodeURIComponent(boardId)}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

