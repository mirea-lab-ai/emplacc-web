// src/features/tasks/types.ts
import type { components } from '@/types/openapi';
import { userCache } from '@/features/user/userCache';

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

export type TaskStatusSummary = {
    id?: string;
    name?: string;
    key?: string;
    boardId?: string;
    projectId?: string;
    isOpen?: boolean;
    isActive?: boolean;
    color?: string;
};

export type UITask = {
    id: string;
    title: string;           // в UI всегда строка
    description?: string;
    due?: string;
    priority?: number;
    boardId?: string;
    projectId?: string;
    statuses?: TaskStatusSummary[];
    assignees?: TaskAssignee[];
};

export type Task = {
    assigned_to?: {id: string, first_name: string, last_name: string};
    community?: number;
    created_at: string;
    created_by: {id: string, first_name: string, last_name: string};
    deadline?: string;
    description?: string;
    id: string;
    name: string;
    priority?: number;
    start_date: string;
    status_id?: string;
    time_spent?: string;
    updated_at?: string;
};

export function mapTask(dto: TaskShort): UITask {
    type TaskShortExtended = TaskShort & {
        assigned_to?: unknown;
        assignees?: unknown;
        executor?: unknown;
        responsible?: unknown;
        users?: unknown;
        description?: unknown;
        desc?: unknown;
        details?: unknown;
        body?: unknown;
        content?: unknown;
        project_id?: unknown;
        projectId?: unknown;
        project?: unknown;
        board_id?: unknown;
        boardId?: unknown;
        status?: unknown;
        status_name?: unknown;
        statusName?: unknown;
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
            const email = data.email ?? data.mail ?? data.user_email ?? data.email_address ?? undefined;


            const name = typeof full === 'string' && full.trim().length > 0
                ? full.trim()
                : [first, last].map((part) => (typeof part === 'string' ? part.trim() : '')).filter(Boolean).join(' ');

            const avatar =
                typeof data.avatar_url === 'string' ? data.avatar_url
                : typeof data.avatar === 'string' ? data.avatar
                : typeof data.image === 'string' ? data.image
                : typeof data.photo === 'string' ? data.photo
                : typeof data.avatarUrl === 'string' ? data.avatarUrl
                : undefined;

            // Если email не найден в данных, попробуем получить из кэша пользователей
            const resolvedEmail = email || (id ? userCache.getUserEmail(String(id)) : undefined);

            return {
                id: typeof id === 'string' || typeof id === 'number' ? String(id) : undefined,
                name: name || undefined,
                email: typeof resolvedEmail === 'string' ? resolvedEmail : undefined,
                avatar: avatar,
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

    const description = [
        extended.description,
        extended.desc,
        extended.details,
        extended.body,
        extended.content,
    ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);

    const statusSummaries: TaskStatusSummary[] = Array.isArray(dto.statuses)
        ? (dto.statuses as StatusResponse[]).reduce<TaskStatusSummary[]>((acc, raw) => {
            if (!raw) return acc;
            const data = raw as Record<string, unknown>;
            const boardCandidate = data.board_id ?? data.boardId ?? data.list_id ?? data.status_board_id ?? data.statusBoardId;
            const nestedBoard = typeof data.board === 'object' && data.board !== null ? (data.board as Record<string, unknown>) : undefined;
            const nestedProject = typeof data.project === 'object' && data.project !== null ? (data.project as Record<string, unknown>) : undefined;
            const boardProject = typeof nestedBoard?.project === 'object' && nestedBoard.project !== null ? (nestedBoard.project as Record<string, unknown>) : undefined;
            const nestedBoardId = nestedBoard?.id ?? nestedBoard?.board_id ?? nestedBoard?.boardId;
            const boardId = boardCandidate ?? nestedBoardId;

            const idCandidate = data.id ?? (data as { status_id?: unknown }).status_id ?? (data as { statusId?: unknown }).statusId;
            const nameCandidate = data.name ?? data.title ?? data.label;
            const keyCandidate = data.key ?? (data as { status_key?: unknown }).status_key ?? (data as { statusKey?: unknown }).statusKey;
            const projectCandidate = data.project_id
                ?? data.projectId
                ?? nestedBoard?.project_id
                ?? nestedBoard?.projectId
                ?? nestedProject?.id
                ?? nestedProject?.project_id
                ?? boardProject?.id
                ?? boardProject?.project_id;

            acc.push({
                id: typeof idCandidate === 'string' || typeof idCandidate === 'number' ? String(idCandidate) : undefined,
                name: typeof nameCandidate === 'string' ? nameCandidate : undefined,
                key: typeof keyCandidate === 'string' ? keyCandidate : undefined,
                boardId: typeof boardId === 'string' || typeof boardId === 'number' ? String(boardId) : undefined,
                projectId: typeof projectCandidate === 'string' || typeof projectCandidate === 'number' ? String(projectCandidate) : undefined,
                isOpen: typeof data.is_open === 'boolean' ? data.is_open : undefined,
                isActive: typeof data.is_active === 'boolean' ? data.is_active : undefined,
                color: typeof data.color === 'string' ? data.color : undefined,
            });

            return acc;
        }, [])
        : [];

    const pushStatusCandidate = (input: unknown) => {
        if (!input) return;
        if (typeof input === 'string') {
            const trimmed = input.trim();
            if (!trimmed) return;
            statusSummaries.push({ name: trimmed });
            return;
        }
        if (typeof input === 'object') {
            const data = input as Record<string, unknown>;
            const nameCandidate = data.name ?? data.title ?? data.label ?? data.status_name ?? data.statusName;
            const keyCandidate = data.key ?? data.status_key ?? data.statusKey;
            const colorCandidate = data.color ?? data.status_color ?? data.statusColor;
            const idCandidate = data.id ?? data.status_id ?? data.statusId;
            const boardCandidate = data.board_id ?? data.boardId;
            const projectCandidate = data.project_id ?? data.projectId;
            if (typeof nameCandidate === 'string' && nameCandidate.trim().length > 0) {
                statusSummaries.push({
                    id: typeof idCandidate === 'string' || typeof idCandidate === 'number' ? String(idCandidate) : undefined,
                    name: nameCandidate.trim(),
                    key: typeof keyCandidate === 'string' ? keyCandidate : undefined,
                    color: typeof colorCandidate === 'string' ? colorCandidate : undefined,
                    boardId: typeof boardCandidate === 'string' || typeof boardCandidate === 'number' ? String(boardCandidate) : undefined,
                    projectId: typeof projectCandidate === 'string' || typeof projectCandidate === 'number' ? String(projectCandidate) : undefined,
                    isOpen: typeof data.is_open === 'boolean' ? data.is_open : undefined,
                    isActive: typeof data.is_active === 'boolean' ? data.is_active : undefined,
                });
                return;
            }
        }
    };

    if (statusSummaries.length === 0) {
        pushStatusCandidate(extended.status);
        if (statusSummaries.length === 0) {
            pushStatusCandidate(extended.status_name ?? extended.statusName);
        }
    }

    const uniqueStatuses = statusSummaries.filter((status, index, array) => {
        const signature = [
            status.id ?? '',
            status.boardId ?? '',
            status.projectId ?? '',
            status.name ?? '',
            status.key ?? '',
        ].join('::');
        return array.findIndex((candidate) => (
            [
                candidate.id ?? '',
                candidate.boardId ?? '',
                candidate.projectId ?? '',
                candidate.name ?? '',
                candidate.key ?? '',
            ].join('::') === signature
        )) === index;
    });

    const explicitBoardCandidate = extended.board_id ?? extended.boardId;

    const projectCandidate = extended.project_id
        ?? extended.projectId
        ?? (typeof extended.project === 'object' && extended.project !== null
            ? (() => {
                const projectData = extended.project as Record<string, unknown>;
                return projectData.id ?? projectData.project_id ?? projectData.projectId;
            })()
            : undefined)
        ?? (uniqueStatuses.find((status) => status?.projectId)?.projectId);

    const boardCandidateResolved = explicitBoardCandidate
        ?? (uniqueStatuses.find((status) => status?.boardId)?.boardId);

    return {
        id: String(dto.id),
        title: dto.name ?? 'Без названия',                    // дефолт, чтобы не было string | undefined
        description: description?.trim(),
        due: dto.deadline ?? undefined,
        priority: typeof dto.priority === 'number' ? dto.priority : undefined,
        boardId: typeof boardCandidateResolved === 'string' || typeof boardCandidateResolved === 'number'
            ? String(boardCandidateResolved)
            : undefined,
        projectId: typeof projectCandidate === 'string' || typeof projectCandidate === 'number' ? String(projectCandidate) : undefined,
    statuses: uniqueStatuses.length > 0 ? uniqueStatuses : undefined,
        assignees: assignees && assignees.length > 0 ? assignees : undefined,
    };
}
