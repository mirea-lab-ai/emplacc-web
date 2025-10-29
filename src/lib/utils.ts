type ClassDictionary = Record<string, boolean | null | undefined>;
type ClassPrimitive = string | number | null | undefined | false;
type ClassValue = ClassPrimitive | ClassDictionary | ClassValue[];

function collect(value: ClassValue, acc: string[]) {
    if (!value && value !== 0) {
        return;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        if (String(value).trim().length > 0) {
            acc.push(String(value));
        }
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item) => collect(item, acc));
        return;
    }

    if (typeof value === 'object') {
        Object.entries(value as ClassDictionary).forEach(([key, condition]) => {
            if (condition) {
                acc.push(key);
            }
        });
    }
}

export function cn(...inputs: ClassValue[]): string {
    const acc: string[] = [];
    inputs.forEach((value) => collect(value, acc));
    return acc.join(' ');
}
