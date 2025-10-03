// src/features/projects/api.ts
import { http } from '@/lib/http';
import type { components } from '@/types/openapi';

// OpenAPI typedefs (best-effort)
type ProjectListResponse = components['schemas']['response.ProjectListResponse'];
type ProjectResponse = components['schemas']['response.ProjectResponse'];

export type UIProject = {
    id: string;
    name: string;
    description?: string;
};

export function mapProject(p: ProjectResponse): UIProject {
    return {
        id: String((p as unknown as { id?: string | number }).id ?? ''),
        name: (p as unknown as { name?: string }).name ?? 'Без названия',
        description: (p as unknown as { description?: string }).description ?? undefined,
    };
}

export async function fetchUserProjects(userId: string): Promise<UIProject[]> {
    // According to backend contract for frontend: /project/user/{id}
    const res = await http(`/project/all/1/20`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as ProjectListResponse | { projects?: ProjectResponse[] } | ProjectResponse[];
    // accept either wrapped or plain list
    const list: ProjectResponse[] = Array.isArray(json)
        ? (json as ProjectResponse[])
        : Array.isArray((json as any).projects)
            ? ((json as any).projects as ProjectResponse[])
            : [];
    return list.map(mapProject);
}


