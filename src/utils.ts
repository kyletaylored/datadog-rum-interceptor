// utils.ts
export function sanitizeData(data: any, sensitiveFields: string[]): any {
    if (!data) return data;

    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return data;
        }
    }

    const sanitized = JSON.parse(JSON.stringify(data));

    function recursiveSanitize(obj: any): void {
        for (const key in obj) {
            if (sensitiveFields.includes(key.toLowerCase())) {
                obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                recursiveSanitize(obj[key]);
            }
        }
    }

    recursiveSanitize(sanitized);
    return sanitized;
}

export function truncateData(data: any, maxSize: number): any {
    const stringified = typeof data === 'string' ? data : JSON.stringify(data);
    if (stringified.length <= maxSize) return data;

    return stringified.substring(0, maxSize) + '... [truncated]';
}

export function shouldExcludeUrl(url: string, excludePatterns: Array<string | RegExp>): boolean {
    return excludePatterns.some(pattern => {
        if (pattern instanceof RegExp) {
            return pattern.test(url);
        }
        return url.includes(pattern);
    });
}