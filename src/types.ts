// types.ts

export interface DDInterceptorConfig {
    // Optional configuration
    enableLogs?: boolean;
    sampleRate?: number;
    maxBodySize?: number;
    excludeUrls?: Array<string | RegExp>;
    sanitizeFields?: string[];

    // Optional callbacks
    beforeRequestLog?: RequestInterceptor;
    afterResponseLog?: ResponseInterceptor;
}

export interface InterceptedRequest {
    url: string;
    method: string;
    body?: any;
    headers?: Record<string, string>;
    timestamp: number;
}

export interface InterceptedResponse {
    status: number;
    body?: any;
    headers?: Record<string, string>;
    duration: number;
}

export type RequestInterceptor = (request: InterceptedRequest) => InterceptedRequest | false;
export type ResponseInterceptor = (response: InterceptedResponse, request: InterceptedRequest) => InterceptedResponse | false;

export interface DDContext {
    session_id?: string;
    application_id?: string;
    view?: {
        url: string;
        referrer: string;
    };
}

// Extend the native XMLHttpRequest interface
declare global {
    interface XMLHttpRequest {
        _ddRequest?: {
            url: string;
            method: string;
            timestamp: number;
        };
    }
}
