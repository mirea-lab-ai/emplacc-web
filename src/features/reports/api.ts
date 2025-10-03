// src/features/reports/api.ts
import { http } from '@/lib/http';
import { getUserId } from '@/lib/auth';
import type { components } from '@/types/openapi';

type HelpRequestsForUser = components['schemas']['response.HelpRequestsForUser'];
type HelpRequestItem = components['schemas']['response.HelpRequestWithAssignerID'] | components['schemas']['response.HelpRequestItem'];

export type UIHelpRequest = {
    id: string;
    authorName?: string;
    task?: string;
    description?: string;
};

function mapHelpRequest(r: any): UIHelpRequest {
    return {
        id: String(r?.id ?? r?.help_requests?.id ?? ''),
        authorName: r?.assigner_first_name && r?.assigner_last_name
            ? `${r.assigner_first_name} ${r.assigner_last_name}`
            : undefined,
        task: r?.task ?? r?.title ?? undefined,
        description: r?.description ?? undefined,
    };
}

export async function fetchMyHelpRequests(): Promise<UIHelpRequest[]> {
    const uid = getUserId();
    if (!uid) return [];
    // OpenAPI в проекте описывает множественное: /report/help-requests-by-user-id/{id}
    let res = await http(`/report/help-requests-by-user-id/${encodeURIComponent(uid)}`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as HelpRequestsForUser | { help_requests?: any[] } | any[];
    const list: any[] = Array.isArray(json)
        ? json
        : Array.isArray((json as any).help_requests)
            ? ((json as any).help_requests as any[])
            : [];
    return list.map(mapHelpRequest);
}


