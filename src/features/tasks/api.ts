// src/features/tasks/api.ts
import { http } from '@/lib/http';
import type { components } from '@/types/openapi';
import { mapTask, UITask, TaskShort } from './types';
import { getUserId, isAuthed } from '@/lib/auth';
// (опционально) если хочешь fallback на /auth/me:
// import { apiMe, type UserInfo } from '@/features/auth/api';

type TaskListResponse = components['schemas']['response.TaskListResponse'];

const TASKS_PATH_TEMPLATE = '/task/user/{userId}/{page}/{pageSize}';
const TASKS_PATH_TEMPLATE_BAD = '/task/all/{page}/{pageSize}';

function buildPath(userId: string, page = 1, pageSize = 20) {
    return TASKS_PATH_TEMPLATE_BAD
        .replace('{userId}', encodeURIComponent(userId))
        .replace('{page}', String(page))
        .replace('{pageSize}', String(pageSize));
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
