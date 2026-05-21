// src/features/teams/api.ts
import { http } from '@/lib/http';

export type UITeam = {
    id: string;
    name: string;
    description?: string;
    members?: number;
};

export type UITeamMember = {
    id: string;
    name: string;
    role: string;
    email?: string;
    avatarUrl?: string;
    profession?: string;
    specialization?: string;
};

export type UITeamFull = {
    id: string;
    name: string;
    description?: string;
    members: UITeamMember[];
    createdAt?: string;
    updatedAt?: string;
};

export type CreateTeamRequest = {
    name: string;
    description?: string;
    user_ids?: string[];
};

export type UpdateTeamRequest = {
    name?: string;
    description?: string;
};

// Получение команд проекта
export async function fetchProjectTeams(projectId: string): Promise<UITeam[]> {
    const res = await http(`/team/project/${encodeURIComponent(projectId)}`, { method: 'GET' });
    // Обрабатываем ошибку 404 как пустой массив
    if (res.status === 404) {
        return [];
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as any;
    // Обработка разных форматов ответа
    const list: any[] = Array.isArray(json)
        ? json
        : json.teams ?? [];
    return list.map((t: any) => ({
        id: String(t.id ?? ''),
        name: t.name ?? 'Без названия',
        description: t.description,
        members: t.members_count ?? t.members?.length ?? 0,
    }));
}

// Получение всех команд
export async function fetchAllTeams(): Promise<UITeamFull[]> {
    const res = await http('/team/all', { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as any;
    const list: any[] = Array.isArray(json)
        ? json
        : json.teams ?? [];
    const resolveSpecialization = (value: any): string | undefined => {
        if (!value) return undefined;
        if (typeof value === 'string') return value.trim() || undefined;
        if (typeof value === 'object') {
            if (typeof value.name === 'string') return value.name.trim() || undefined;
            if (typeof value.title === 'string') return value.title.trim() || undefined;
        }
        return undefined;
    };

    return list.map((team: any) => {
        const rawMembers: any[] = Array.isArray(team.members) ? team.members : [];

        const members: UITeamMember[] = rawMembers.map((member: any) => {
            const specializationResolved = resolveSpecialization(member?.specialization) ?? resolveSpecialization(member?.profession);
            const name = `${member?.first_name ?? ''} ${member?.last_name ?? ''}`.trim();
            return {
                id: String(member?.user_id ?? ''),
                name: name || 'Без имени',
                role: specializationResolved ?? resolveSpecialization(member?.role) ?? 'Member',
                profession: resolveSpecialization(member?.profession),
                specialization: specializationResolved,
                email: member?.email,
                avatarUrl: member?.avatar_url || undefined,
            } satisfies UITeamMember;
        });

        return {
            id: String(team.id ?? ''),
            name: team.name ?? 'Без названия',
            description: team.description,
            members,
            createdAt: team.created_at,
            updatedAt: team.updated_at,
        } satisfies UITeamFull;
    });
}

// Создание команды
export async function createTeam(payload: CreateTeamRequest): Promise<UITeamFull> {
    const res = await http('/team', {
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
        members: [],
        createdAt: json.created_at ?? new Date().toISOString(),
        updatedAt: json.updated_at ?? new Date().toISOString(),
    };
}

// Обновление команды
export async function updateTeam(teamId: string, payload: UpdateTeamRequest): Promise<void> {
    const res = await http(`/team/${encodeURIComponent(teamId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Сервер может вернуть JSON с сообщением, поэтому учитываем это,
    // но в UI сейчас данные не используются.
    try {
        if (res.headers.get('content-type')?.includes('application/json')) {
            await res.json();
        }
    } catch (err) {
        // Игнорируем ошибки парсинга, если тело пустое
    }
}

// Удаление команды
export async function deleteTeam(teamId: string): Promise<void> {
    const res = await http(`/team/${encodeURIComponent(teamId)}`, {
        method: 'DELETE',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Получение проектов команды
export async function fetchTeamProjects(teamId: string): Promise<any[]> {
    const res = await http(`/project/team/${encodeURIComponent(teamId)}`, {
        method: 'GET',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.projects || [];
}

// Удаление участника из команды
export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
    const res = await http('/team/user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            team_id: teamId,
            user_id: userId,
        }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Получение всех проектов
export async function fetchAllProjects(page = 1, pageSize = 100): Promise<any[]> {
    const res = await http(`/project/all/${page}/${pageSize}`, {
        method: 'GET',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.projects || [];
}

// Привязка проекта к команде
export async function addProjectToTeam(teamId: string, projectId: string): Promise<void> {
    const res = await http('/team/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            team_id: teamId,
            project_id: projectId,
        }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Добавление пользователей в команду
export async function addUsersToTeam(teamId: string, userIds: string[]): Promise<void> {
    const res = await http('/team/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            team_id: teamId,
            user_ids: userIds,
        }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Привязка команды к проекту
export async function addTeamToProject(projectId: string, teamId: string): Promise<void> {
    const res = await http('/team/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            project_id: projectId,
            team_id: teamId,
        }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Отвязка команды от проекта
export async function removeTeamFromProject(projectId: string, teamId: string): Promise<void> {
    const res = await http('/team/project', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            project_id: projectId,
            team_id: teamId,
        }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
