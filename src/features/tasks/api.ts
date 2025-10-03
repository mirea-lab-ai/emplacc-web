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
