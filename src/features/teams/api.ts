// src/features/teams/api.ts
import { http } from '@/lib/http';

export type UITeam = {
    id: string;
    name: string;
    description?: string;
    members?: number;
};

// Получение команд проекта
export async function fetchProjectTeams(projectId: string): Promise<UITeam[]> {
    const res = await http(`/team/project/${encodeURIComponent(projectId)}`, { method: 'GET' });
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

