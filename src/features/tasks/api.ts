// src/features/tasks/api.ts
import { http } from '@/lib/http';
import type { components } from '@/types/openapi';
import { mapTask, UITask, TaskShort } from './types';
import { getUserId, isAuthed } from '@/lib/auth';
// (опционально) если хочешь fallback на /auth/me:
// import { apiMe, type UserInfo } from '@/features/auth/api';

type TaskListResponse = components['schemas']['response.TaskListResponse'];

const TASKS_PATH_TEMPLATE = '/task/user/{id}/{page}/{pagesize}';

function buildPath(userId: string, page = 1, pageSize = 20) {
    return TASKS_PATH_TEMPLATE
        .replace('{id}', encodeURIComponent(userId))
        .replace('{page}', String(page))
        .replace('{pagesize}', String(pageSize));
}

export async function fetchMyTasks(page = 1, pageSize = 20): Promise<UITask[]> {
    // 1) userId берём из локального хранилища (мы сохранили его при логине)
    const uid = getUserId();
    if (!uid) throw new Error('Нет userId');

    // 2) запрос задач
    const path = buildPath(uid, page, pageSize);
    const res = await http(path, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as TaskListResponse;
    
    const list: TaskShort[] = Array.isArray(json.tasks) ? (json.tasks as TaskShort[]) : [];
    return list.map(mapTask);
}

export type CreateTaskRequest = {
    name: string;
    description?: string;
    status_id: string;
    creator_id: string;
    priority: number;
    start_date: string;
    deadline: string;
    assigned_to?: string;
    category: number;
};

export type CreateTaskResponse = {
    id: string;
    title: string;
    description?: string;
    status_id: string;
    created_at: string;
    updated_at: string;
};

// Создание новой задачи
export async function createTask(payload: CreateTaskRequest): Promise<CreateTaskResponse> {
    const res = await http('/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as any;
    
    return {
        id: String(json.id ?? ''),
        title: json.title ?? '',
        description: json.description,
        status_id: json.status_id ?? '',
        created_at: json.created_at ?? '',
        updated_at: json.updated_at ?? '',
    };
}

// Удаление задачи
export async function deleteTask(taskId: string): Promise<void> {
    const res = await http(`/task/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export type MoveTaskRequest = {
    task_id: string;
    status_id: string;
};

export type MoveTaskResponse = {
    id: string;
    status_id: string;
    updated_at: string;
};

// Перемещение задачи в другой статус
export async function moveTask(payload: MoveTaskRequest): Promise<MoveTaskResponse> {
    const res = await http('/task/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as any;
    
    return {
        id: String(json.id ?? ''),
        status_id: json.status_id ?? '',
        updated_at: json.updated_at ?? '',
    };
}

// Получение задач конкретной доски
export async function fetchBoardTasks(boardId: string): Promise<UITask[]> {
    // Получаем все доски проекта, чтобы найти нужную доску
    const res = await http(`/boards/project/${encodeURIComponent(boardId)}`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as any;
    
    
    // Обработка структуры ответа: boards -> statuses -> tasks
    if (json.boards && Array.isArray(json.boards)) {
        const allTasks: UITask[] = [];
        for (const board of json.boards) {
            if (board.statuses && Array.isArray(board.statuses)) {
                for (const status of board.statuses) {
                    if (status.tasks && Array.isArray(status.tasks)) {
                        allTasks.push(...status.tasks.map(mapTask));
                    }
                }
            }
        }
        return allTasks;
    }
    
    // Fallback для других форматов
    const list: any[] = Array.isArray(json) 
        ? json 
        : json.tasks ?? [];
    
    return list.map(mapTask);
}

// Получение задач конкретной доски по projectId и boardId
export async function fetchBoardTasksByProjectAndBoard(projectId: string, boardId: string): Promise<UITask[]> {
    const res = await http(`/boards/project/${encodeURIComponent(projectId)}`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as any;
    
    
    // Обработка структуры ответа: boards -> statuses -> tasks
    if (json.boards && Array.isArray(json.boards)) {
        // Находим конкретную доску
        const targetBoard = json.boards.find((board: any) => board.id === boardId);
        if (!targetBoard) {
            return [];
        }
        
        const allTasks: UITask[] = [];
        if (targetBoard.statuses && Array.isArray(targetBoard.statuses)) {
            for (const status of targetBoard.statuses) {
                if (status.tasks && Array.isArray(status.tasks)) {
                    allTasks.push(...status.tasks.map(mapTask));
                }
            }
        }
        return allTasks;
    }
    
    return [];
}

// Получение задачи по ID
export async function fetchTaskById(taskId: string): Promise<any> {
    const res = await http(`/task/${encodeURIComponent(taskId)}`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export type UpdateTaskRequest = {
    name?: string;
    description?: string;
    assigned_to?: string;
    priority?: number;
    deadline?: string;
    status_id?: string;
    start_date?: string;
    category?: number;
};

// Обновление задачи
export async function updateTask(taskId: string, payload: UpdateTaskRequest): Promise<any> {
    // Фильтруем пустые значения
    const filteredPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, value]) => value !== undefined && value !== null && value !== '')
    );

    const res = await http(`/task/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filteredPayload),
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}
