// src/features/tasks/types.ts
import type { components } from '@/types/openapi';

// Типы прямо из сгенерённого openapi.d.ts
export type TaskShort = components['schemas']['response.TaskShort'];
export type StatusResponse = components['schemas']['response.StatusResponse'];

export type TaskAssignee = {
    id?: string;
    name?: string;
    email?: string;
    avatar?: string;
};

export type TaskPriorityValue = 1 | 2 | 3 | 4 | 5;

export type TaskPriorityMeta = {
    value: TaskPriorityValue;
    label: string;
    order: number;
    badgeClass: string;
};

const PRIORITY_META: Record<TaskPriorityValue, TaskPriorityMeta> = {
    1: {
        value: 1,
        label: 'Не задан',
        order: 5,
        badgeClass: 'bg-slate-700/40 text-slate-200 ring-slate-500/50',
    },
    2: {
        value: 2,
        label: 'Низкий',
        order: 4,
        badgeClass: 'bg-emerald-800/25 text-emerald-100 ring-emerald-500/40',
    },
    3: {
        value: 3,
        label: 'Средний',
        order: 3,
        badgeClass: 'bg-amber-600/25 text-amber-100 ring-amber-400/40',
    },
    4: {
        value: 4,
        label: 'Высокий',
        order: 2,
        badgeClass: 'bg-orange-600/30 text-orange-100 ring-orange-500/50',
    },
    5: {
        value: 5,
        label: 'СРОЧНЫЙ',
        order: 1,
        badgeClass: 'bg-rose-600/30 text-rose-50 ring-rose-400/60',
    },
};

export const TASK_PRIORITY_OPTIONS: TaskPriorityMeta[] = Object.values(PRIORITY_META).sort(
    (a, b) => a.value - b.value,
);

export function getTaskPriorityMeta(value?: number | null): TaskPriorityMeta {
    const fallback = PRIORITY_META[1];
    if (value == null) return fallback;

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;

    const meta = PRIORITY_META[numeric as TaskPriorityValue];
    return meta ?? fallback;
}

export type UITask = {
    id: string;
    title: string;           // в UI всегда строка
    due?: string;
    priority?: number;
    statuses?: string[];
    assignees?: TaskAssignee[];
};

export function mapTask(dto: TaskShort): UITask {
    type TaskShortExtended = TaskShort & {
        assigned_to?: unknown;
        assignees?: unknown;
        executor?: unknown;
        responsible?: unknown;
        users?: unknown;
    };

    const normalizeAssignee = (input: unknown): TaskAssignee | null => {
        if (!input) return null;

        if (typeof input === 'string' || typeof input === 'number') {
            const id = String(input);
            return { id, name: id };
        }

        if (Array.isArray(input)) {
            // Берем первого элемента массива; дальнейшая обработка выполняется выше
            return normalizeAssignee(input[0] ?? null);
        }

        if (typeof input === 'object') {
            const data = input as Record<string, unknown>;
            const id = data.user_id ?? data.id ?? data.userId ?? data.userid;
            const first = data.first_name ?? data.firstName ?? '';
            const last = data.last_name ?? data.lastName ?? '';
            const full = data.name ?? data.full_name ?? data.display_name ?? data.username ?? `${first} ${last}`;
            const email = data.email ?? data.mail ?? undefined;
            const avatar = data.avatar_url ?? data.avatar ?? data.image ?? data.photo ?? undefined;

            const name = typeof full === 'string' && full.trim().length > 0
                ? full.trim()
                : [first, last].map((part) => (typeof part === 'string' ? part.trim() : '')).filter(Boolean).join(' ');

            return {
                id: typeof id === 'string' || typeof id === 'number' ? String(id) : undefined,
                name: name || undefined,
                email: typeof email === 'string' ? email : undefined,
                avatar: typeof avatar === 'string' ? avatar : undefined,
            };
        }

        return null;
    };

    const extended = dto as TaskShortExtended;
    const rawAssignees = extended.assignees ?? extended.assigned_to ?? extended.executor ?? extended.responsible ?? extended.users;
    let assignees: TaskAssignee[] | undefined;

    if (Array.isArray(rawAssignees)) {
        assignees = rawAssignees
            .map((item) => normalizeAssignee(item))
            .filter((item): item is TaskAssignee => !!item && !!(item.id || item.name));
    } else {
        const single = normalizeAssignee(rawAssignees);
        if (single && (single.id || single.name)) {
            assignees = [single];
        }
    }

    return {
        id: String(dto.id),
        title: dto.name ?? 'Без названия',                    // дефолт, чтобы не было string | undefined
        due: dto.deadline ?? undefined,
        priority: typeof dto.priority === 'number' ? dto.priority : undefined,
        statuses: dto.statuses?.map((s: StatusResponse) => s.name).filter(Boolean) as string[] | undefined,
        assignees: assignees && assignees.length > 0 ? assignees : undefined,
    };
}
