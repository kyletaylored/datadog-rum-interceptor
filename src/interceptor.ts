let datadogRum: any;
let datadogLogs: any;

try {
    datadogRum = require('@datadog/browser-rum');
} catch (e) {
    console.warn('Datadog RUM is not installed. DDRumInterceptor will not work without it.');
}

try {
    datadogLogs = require('@datadog/browser-logs');
} catch (e) {
    console.warn('Datadog Logs is not installed. Logging will be disabled.');
}

import { DDInterceptorConfig, InterceptedRequest, InterceptedResponse, DDContext } from './types';
import { sanitizeData, shouldExcludeUrl, truncateData } from './utils';

export class DDRumInterceptor {
    private config: Required<DDInterceptorConfig>;
    private initialized: boolean = false;
    private logger: any;

    constructor(config: Partial<DDInterceptorConfig> = {}) {
        this.config = {
            enableLogs: true,
            sampleRate: 100,
            maxBodySize: 100000,
            excludeUrls: [],
            sanitizeFields: ['password', 'token', 'apiKey', 'secret'],
            beforeRequestLog: (req) => req,
            afterResponseLog: (res, req) => res,
            ...config
        };
    }

    public init(): void {
        if (this.initialized) {
            console.warn('DDRumInterceptor already initialized');
            return;
        }

        // Check if RUM is available
        if (!datadogRum?.getInternalContext) {
            throw new Error('Datadog RUM is required but not found. Please ensure it is installed and initialized.');
        }

        if (this.config.enableLogs && !datadogLogs?.createLogger) {
            console.warn('Datadog Logs is not available. Logging will be disabled.');
            this.config.enableLogs = false;
        }

        // Initialize if applicable
        if (this.config.enableLogs) {
            this.initializeLogs();
        }

        this.interceptXHR();
        this.interceptFetch();
        this.initialized = true;
    }

    private initializeLogs(): void {
        if (!datadogLogs?.getGlobalContext) return;

        const rumContext = datadogRum.getInternalContext();
        datadogLogs.init({
            clientToken: rumContext.client_token,
            site: rumContext.site,
            service: rumContext.service,
            forwardErrorsToLogs: true,
        });

        this.logger = datadogLogs.createLogger('network', {
            handler: 'network-interceptor',
            ...this.getRUMContext(),
        });
    }

    private getRUMContext(): DDContext {
        const rumContext = datadogRum?.getInternalContext?.();
        return {
            session_id: rumContext?.session_id,
            application_id: rumContext?.application_id,
            view: {
                url: window.location.href,
                referrer: document.referrer,
            },
        };
    }

    private processRequest(request: InterceptedRequest): InterceptedRequest | false {
        if (shouldExcludeUrl(request.url, this.config.excludeUrls)) {
            return false;
        }

        const processed = { ...request };

        if (processed.body) {
            processed.body = sanitizeData(processed.body, this.config.sanitizeFields);
            processed.body = truncateData(processed.body, this.config.maxBodySize);
        }

        return this.config.beforeRequestLog(processed);
    }

    private processResponse(response: InterceptedResponse, request: InterceptedRequest): InterceptedResponse | false {
        const processed = { ...response };

        if (processed.body) {
            processed.body = sanitizeData(processed.body, this.config.sanitizeFields);
            processed.body = truncateData(processed.body, this.config.maxBodySize);
        }

        return this.config.afterResponseLog(processed, request);
    }

    private logNetworkEvent(request: InterceptedRequest, response: InterceptedResponse): void {
        const context = this.getRUMContext();
        const tags = [
            `endpoint:${new URL(request.url).pathname}`,
            `method:${request.method}`,
            `status:${response.status}`
        ];

        if (this.config.enableLogs) {
            datadogLogs.logger.info('Network Request', {
                ...context,
                network: {
                    url: request.url,
                    method: request.method,
                    status_code: response.status,
                    duration: response.duration
                },
                request: {
                    body: request.body,
                    headers: request.headers
                },
                response: {
                    body: response.body,
                    headers: response.headers
                },
                tags
            });
        }
    }

    private interceptXHR(): void {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        const self = this;

        XMLHttpRequest.prototype.open = function (
            method: string,
            url: string | URL,
            async?: boolean,
            username?: string | null,
            password?: string | null
        ) {
            this._ddRequest = {
                url: url?.toString(),
                method: method.toUpperCase(),
                timestamp: Date.now(),
            };
            const asyncFlag = async ?? true; // Default to true if undefined
            return originalOpen.call(this, method, url, asyncFlag, username, password);
        };


        XMLHttpRequest.prototype.send = function (body) {
            if (!this._ddRequest) return originalSend.apply(this, [body]);

            const request: InterceptedRequest = {
                ...this._ddRequest,
                body,
                headers: {}
            };

            const processedRequest = self.processRequest(request);
            if (!processedRequest) return originalSend.apply(this, [body]);

            this.addEventListener('load', function () {
                const response: InterceptedResponse = {
                    status: this.status,
                    body: this.response,
                    headers: {},
                    duration: Date.now() - request.timestamp
                };

                const processedResponse = self.processResponse(response, processedRequest);
                if (processedResponse) {
                    self.logNetworkEvent(processedRequest, processedResponse);
                }
            });

            return originalSend.apply(this, [body]);

        };
    }

    private interceptFetch(): void {
        const originalFetch = window.fetch;
        const self = this;

        window.fetch = async function (...args) {
            const request = args[0] instanceof Request ? args[0] : new Request(args[0], args[1]);
            const timestamp = Date.now();

            const interceptedRequest: InterceptedRequest = {
                url: request.url,
                method: request.method,
                timestamp,
                headers: Object.fromEntries((request.headers as any).entries()),
            };

            try {
                interceptedRequest.body = await request.clone().text();
            } catch (e) {
                interceptedRequest.body = '[Unable to read body]';
            }

            const processedRequest = self.processRequest(interceptedRequest);
            if (!processedRequest) return originalFetch.apply(this, args);

            try {
                const response = await originalFetch.apply(this, args);
                const responseClone = response.clone();

                const interceptedResponse: InterceptedResponse = {
                    status: response.status,
                    headers: Object.fromEntries((response.headers as any).entries()),
                    duration: Date.now() - timestamp
                };

                try {
                    interceptedResponse.body = await responseClone.text();
                } catch (e) {
                    interceptedResponse.body = '[Unable to read body]';
                }

                const processedResponse = self.processResponse(interceptedResponse, processedRequest);
                if (processedResponse) {
                    self.logNetworkEvent(processedRequest, processedResponse);
                }

                return response;
            } catch (error: any) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorResponse: InterceptedResponse = {
                    status: 0,
                    body: errorMessage,
                    duration: Date.now() - timestamp,
                };

                const processedResponse = self.processResponse(errorResponse, interceptedRequest);
                if (processedResponse) {
                    self.logNetworkEvent(interceptedRequest, processedResponse);
                }

                throw error;
            }

        };
    }
}