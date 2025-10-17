// src/features/reports/api.ts
import { http } from '@/lib/http';
import { getUserId } from '@/lib/auth';
import type { components } from '@/types/openapi';

type HelpRequestsForUser = components['schemas']['response.HelpRequestsForUser'];
type APIHelpRequestItem = components['schemas']['response.HelpRequestWithAssignerID'] | components['schemas']['response.HelpRequestItem'];

export type UIHelpRequest = {
    id: string;
    authorName?: string;
    task?: string;
    description?: string;
};

function mapHelpRequest(r: any): UIHelpRequest {
    return {
        id: String(r?.help_request?.id ?? r?.id ?? ''),
        authorName: r?.user_first_name && r?.user_last_name
            ? `${r.user_first_name} ${r.user_last_name}`
            : undefined,
        task: r?.task ?? r?.title ?? undefined,
        description: r?.help_request?.description ?? r?.description ?? undefined,
    };
}

export async function fetchMyHelpRequests(): Promise<UIHelpRequest[]> {
    const uid = getUserId();
    if (!uid) return [];
    // OpenAPI в проекте описывает множественное: /report/help-requests-by-user-id/{id}
    const res = await http(`/report/help-requests-by-user-id/${encodeURIComponent(uid)}`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as HelpRequestsForUser | { help_requests?: any[] } | any[];
    const list: any[] = Array.isArray(json)
        ? json
        : Array.isArray((json as any).help_requests)
            ? ((json as any).help_requests as any[])
            : [];
    return list.map(mapHelpRequest);
}

// Типы для создания отчета
export type CompletedWorkItem = {
    task_id: string;
    description: string;
};

export type HelpRequestItem = {
    helper_id: string;
    description: string;
    status: string;
};

export type TomorrowPlanItem = {
    task_id: string;
    id: string;
    description: string;
};

export type CreateReportRequest = {
    complete_work: CompletedWorkItem[];
    help: HelpRequestItem[];
    plan_tomorrow: TomorrowPlanItem[];
    problems: string[];
    report_date: string;
    user_id: string;
};

// Создание отчета
export async function createReport(payload: CreateReportRequest): Promise<any> {
    const res = await http('/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

// Получение отчетов пользователя
export async function fetchUserReports(userId: string, page = 1, pageSize = 1): Promise<any> {
    const res = await http(`/report/user/${encodeURIComponent(userId)}/${page}/${pageSize}`, {
        method: 'GET',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

// Экспорт отчетов в Excel
export async function exportReportsToExcel(startDate: string, endDate: string): Promise<Blob> {
    // Преобразуем даты в формат ISO (как в остальной части приложения)
    const startDateISO = new Date(startDate + 'T00:00:00').toISOString();
    const endDateISO = new Date(endDate + 'T23:59:59').toISOString();

    const res = await http('/report/export/xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            start_date: startDateISO,
            end_date: endDateISO,
        }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
}

// Завершение просьбы о помощи
export async function completeHelpRequest(helpRequestId: string): Promise<void> {
    const res = await http(`/report/help-request/${encodeURIComponent(helpRequestId)}`, {
        method: 'DELETE',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}


