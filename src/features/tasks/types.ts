// src/features/tasks/types.ts
import type { components } from '@/types/openapi';

// Типы прямо из сгенерённого openapi.d.ts
export type TaskShort = components['schemas']['response.TaskShort'];
export type StatusResponse = components['schemas']['response.StatusResponse'];

export type UITask = {
    id: string;
    title: string;           // в UI всегда строка
    due?: string;
    priority?: number;
    statuses?: string[];
};

export function mapTask(dto: TaskShort): UITask {
    return {
        id: String(dto.id),
        title: dto.name ?? 'Без названия',                    // дефолт, чтобы не было string | undefined
        due: dto.deadline ?? undefined,
        priority: typeof dto.priority === 'number' ? dto.priority : undefined,
        statuses: dto.statuses?.map((s: StatusResponse) => s.name).filter(Boolean) as string[] | undefined,
    };
}
