/**
 * @file baseInterceptor.js
 * @description Shared logic for intercepting requests and logging them to Datadog Logs if present.
 */

import { BatchInterceptor } from '@mswjs/interceptors';
import { createIdentifier } from './utils/trace';
import { isRequestAllowed } from './utils/rules';

/**
 * @typedef {Object} InterceptorOptions
 * @property {Array<string|RegExp|Function>} [excludeUrls=[]] - URLs or paths to exclude from logging.
 * @property {string|string[]} [mask] - Text or array of strings to mask in request/response bodies.
 * @property {Function} [beforeLog] - Callback function receiving request and response objects for custom processing.
 * @property {Object} [datadogLogs] - Datadog Logs instance for logging.
 */

/**
 * Base function that sets up logging logic referencing `datadogLogs` from options.
 *
 * @param {InterceptorOptions} options
 * @param {import('@mswjs/interceptors').Interceptor[]} environmentInterceptors
 * @returns {{ stop: () => void }}
 */
export function createBaseInterceptor(options, environmentInterceptors) {
    const {
        excludeUrls = [],
        mask = [],
        beforeLog = null,
        datadogLogs = null
    } = options || {};

    // Hardcoded exclusion for all *.datadoghq.com URLs
    const datadogExclusionPattern = /datadoghq\.com/i;

    // Combine user-provided excludeUrls with the hardcoded Datadog exclusion
    const combinedExcludeUrls = [
        ...excludeUrls,
        datadogExclusionPattern
    ];

    // Placeholder for allowedTracingUrls
    let allowedTracingUrls = [];

    /**
     * Function to retrieve allowedTracingUrls from Datadog RUM configuration
     */
    const retrieveAllowedTracingUrls = () => {
        if (window.datadogRum && typeof window.datadogRum.getInitConfiguration === 'function') {
            const rumConfig = window.datadogRum.getInitConfiguration();
            allowedTracingUrls = rumConfig?.allowedTracingUrls || [];
        } else {
            console.warn('Datadog RUM is not initialized or getInitConfiguration is unavailable.');
        }
    };

    // Retrieve allowedTracingUrls based on environment
    if (window.datadogRum && typeof window.datadogRum.onReady === 'function') {
        // Browser environment: wait for RUM to be ready
        window.datadogRum.onReady(() => {
            retrieveAllowedTracingUrls();
        });
    } else {
        // Node or synchronous environment: attempt to retrieve immediately
        retrieveAllowedTracingUrls();
    }

    // Initialize interceptors
    const interceptor = new BatchInterceptor({
        name: 'datadog-rum-interceptor',
        interceptors: environmentInterceptors
    });

    interceptor.apply();

    /**
     * Mask sensitive fields in the body based on the `mask` configuration.
     *
     * @param {any} body - The request or response body.
     * @returns {any} - The masked body.
     */
    function applyMask(body) {
        if (typeof body === 'object' && body !== null) {
            const copy = JSON.parse(JSON.stringify(body)); // Deep clone to avoid mutations
            if (Array.isArray(mask)) {
                mask.forEach((field) => {
                    if (field in copy) {
                        copy[field] = '***REDACTED***';
                    }
                });
            } else if (typeof mask === 'string') {
                if (mask in copy) {
                    copy[mask] = '***REDACTED***';
                }
            }
            return copy;
        }
        return body;
    }

    /**
     * Log the captured request & response data, respecting `allowedTracingUrls` and `combinedExcludeUrls`.
     * Applies masking and allows for custom processing via `beforeLog`.
     *
     * @param {Object} request
     * @param {Object} response
     */
    async function logToDatadog(request, response) {
        // Extract URL
        const url = request.url;

        // Retrieve trace ID if present
        const traceId = request?.headers?.['x-datadog-trace-id'] || null;

        // Apply masking
        const maskedRequestBody = applyMask(request.body);
        const maskedResponseBody = applyMask(response.body);

        // Allow custom processing before logging
        let processedRequest = { ...request, body: maskedRequestBody };
        let processedResponse = { ...response, body: maskedResponseBody };

        if (typeof beforeLog === 'function') {
            try {
                const result = await beforeLog(processedRequest, processedResponse);
                if (result) {
                    processedRequest = result.request || processedRequest;
                    processedResponse = result.response || processedResponse;
                }
            } catch (error) {
                console.error('Error in beforeLog callback:', error);
            }
        }

        // Log to Datadog Logs if available
        if (datadogLogs?.logger) {
            datadogLogs.logger.info('HTTP Intercepted Request/Response', {
                request: {
                    method: processedRequest.method,
                    url: url,
                    body: processedRequest.body
                },
                response: {
                    status: processedResponse.status,
                    body: processedResponse.body
                },
                traceId
            });
        }
    }

    // Listen for requests.
    interceptor.on('request', ({ request }) => {
        // Early evaluation: Is this request allowed?
        if (!isRequestAllowed(request.url, allowedTracingUrls, combinedExcludeUrls)) {
            return; // Skip logging and processing
        }

        // Create trace ID if missing.
        if (!request.headers.has('x-datadog-trace-id')) {
            // Generates a trace ID matching RUM Browser SDK logic.
            request.headers.append('x-datadog-trace-id', createIdentifier(64));
        }
    });

    // Listen for response events and log them
    interceptor.on('response', async ({ response, request }) => {
        // Clone request and response to safely read their bodies
        const clonedResponse = await response.clone();
        const clonedRequest = await request.clone();

        // Log the request and response
        await logToDatadog(clonedRequest, clonedResponse);
    });

    /**
     * Stop the interceptor and clean up.
     */
    function stop() {
        interceptor.dispose();
    }

    return { stop };
}
