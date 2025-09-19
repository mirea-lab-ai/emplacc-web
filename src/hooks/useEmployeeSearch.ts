'use client';
import { useMemo } from 'react';
import { Employee } from '@/lib/types';

export function useEmployeeSearch(
    employees?: Employee[],
    query?: string,
    excludeIds?: string[],
) {
    // безопасные значения по умолчанию
    const list = Array.isArray(employees) ? employees : [];
    const exclude = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    const q = (query ?? '').trim().toLowerCase();

    return useMemo(() => {
        return list
            .filter((e) => !exclude.has(e.id))
            .filter((e) =>
                q
                    ? [e.name, e.email, e.role]
                        .filter(Boolean)
                        .some((v) => String(v).toLowerCase().includes(q))
                    : true
            )
            .slice(0, 20);
        // В зависимостях оставляем оригинальные ссылки:
    }, [list, q, excludeIds]);
}
