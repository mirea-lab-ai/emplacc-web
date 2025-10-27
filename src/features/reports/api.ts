// src/features/reports/api.ts
import { http } from '@/lib/http';
import { getUserId } from '@/lib/auth';
import type { components } from '@/types/openapi';
import { userCache } from '@/features/user/userCache';

type HelpRequestsForUser = components['schemas']['response.HelpRequestsForUser'];
type APIHelpRequestItem = components['schemas']['response.HelpRequestWithAssignerID'] | components['schemas']['response.HelpRequestItem'];
type APIReportResponse = components['schemas']['response.ReportResponse'];
type APIReportListResponse = components['schemas']['response.ReportListResponse'];

export type UIReportUser = {
    id?: string;
    firstName?: string;
    lastName?: string;
    name: string;
    email?: string;
    avatarUrl?: string;
};

export type UIReportCompletedWork = {
    id?: string;
    taskId?: string;
    description?: string;
};

export type UIReportPlan = {
    id?: string;
    taskId?: string;
    description?: string;
};

export type UIReportHelpRequest = {
    id?: string;
    helperId?: string;
    description?: string;
    status?: string;
};

export type UIReportProblem = {
    id?: string;
    name?: string;
    description: string[];
};

export type UIReport = {
    id: string;
    reportDate?: string;
    createdAt?: string;
    updatedAt?: string;
    checked?: number;
    user: UIReportUser;
    completedWork: UIReportCompletedWork[];
    tomorrowPlans: UIReportPlan[];
    helpRequests: UIReportHelpRequest[];
    problems: UIReportProblem[];
};

export type ReportListResult = {
    items: UIReport[];
    total: number;
    page: number;
    pageSize: number;
};

const normalizeString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const mapReport = (report: APIReportResponse | null | undefined): UIReport => {
    const dto = report ?? {};
    const userInfo = (dto.user_info ?? {}) as Record<string, unknown>;
    const firstName = normalizeString(userInfo.first_name);
    const lastName = normalizeString(userInfo.last_name);
    const userId = normalizeString(userInfo.id);
    const userEmail = normalizeString(userInfo.email) || (userId ? userCache.getUserEmail(userId) : undefined);
    const userAvatarUrl = normalizeString(userInfo.avatar_url) || normalizeString(userInfo.avatar);
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    const completedWork: UIReportCompletedWork[] = Array.isArray(dto.completed_work)
        ? dto.completed_work.map((item) => {
            const record = (item ?? {}) as Record<string, unknown>;
            return {
                id: normalizeString(record.id),
                taskId: normalizeString(record.task_id),
                description: normalizeString(record.description),
            };
        })
        : [];

    const tomorrowPlans: UIReportPlan[] = Array.isArray(dto.plan_tomorrow)
        ? dto.plan_tomorrow.map((item) => {
            const record = (item ?? {}) as Record<string, unknown>;
            return {
                id: normalizeString(record.id),
                taskId: normalizeString(record.task_id),
                description: normalizeString(record.description),
            };
        })
        : [];

    const helpRequests: UIReportHelpRequest[] = Array.isArray(dto.help_requests)
        ? dto.help_requests.map((item) => {
            const record = (item ?? {}) as Record<string, unknown>;
            return {
                id: normalizeString(record.id),
                helperId: normalizeString(record.helper_id),
                description: normalizeString(record.description),
                status: normalizeString(record.status),
            };
        })
        : [];

    const problems: UIReportProblem[] = Array.isArray(dto.problem)
        ? dto.problem.map((item) => {
            const record = (item ?? {}) as Record<string, unknown>;
            const descriptionRaw = record.description;
            return {
                id: normalizeString(record.id),
                name: normalizeString(record.name),
                description: Array.isArray(descriptionRaw)
                    ? descriptionRaw.map((value) => String(value)).filter(Boolean)
                    : [],
            };
        })
        : [];

    const baseId = normalizeString(dto.id);
    const fallbackId = `${userId ?? 'report'}-${normalizeString(dto.report_date) ?? normalizeString(dto.created_at) ?? Date.now().toString()}`;

    return {
        id: baseId && baseId.length > 0 ? baseId : fallbackId,
        reportDate: normalizeString(dto.report_date),
        createdAt: normalizeString(dto.created_at),
        updatedAt: normalizeString(dto.updated_at),
        checked: typeof dto.checked === 'number' ? dto.checked : undefined,
        user: {
            id: userId,
            firstName,
            lastName,
            name: fullName || userId || 'Без имени',
            email: userEmail,
            avatarUrl: userAvatarUrl,
        },
        completedWork,
        tomorrowPlans,
        helpRequests,
        problems,
    } satisfies UIReport;
};

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
    description: string;
    task_id?: string;
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
    console.log('Sending createReport request with payload:', payload);
    const res = await http('/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        console.error('createReport failed with status:', res.status, 'response:', await res.text());
        throw new Error(`HTTP ${res.status}`);
    }
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

export async function fetchAllReports(page = 1, pageSize = 20): Promise<ReportListResult> {
    const res = await http(`/report/all/${page}/${pageSize}`, {
        method: 'GET',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as APIReportListResponse;
    const reportsRaw = Array.isArray(json?.reports) ? json.reports : [];
    return {
        items: reportsRaw.map((item) => mapReport(item)),
        total: typeof json?.total_count === 'number' ? json.total_count : reportsRaw.length,
        page: typeof json?.page === 'number' ? json.page : page,
        pageSize: typeof json?.page_size === 'number' ? json.page_size : pageSize,
    } satisfies ReportListResult;
}

export async function fetchReportById(reportId: string): Promise<UIReport | null> {
    if (!reportId) return null;
    const res = await http(`/report/${encodeURIComponent(reportId)}`, {
        method: 'GET',
    });

    if (res.status === 404) {
        return null;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as APIReportResponse;
    return mapReport(json);
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
