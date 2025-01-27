/**
 * @file baseInterceptor.js
 * @description Shared logic for intercepting requests and logging them to Datadog Logs if present.
 */

import { BatchInterceptor } from '@mswjs/interceptors';
import { matchList, isMatchOption } from './utils/match';
import { parseBody, applyMask } from './utils/parse';
import { setLoggerDebug, logger } from './utils/logger';
import { isNode, getDatadogLogs, getDatadogRum } from './utils/random';

/**
 * @typedef {Object} InterceptorOptions
 * @property {Array<string|RegExp|Function>} [excludeUrls=[]] - URLs or paths to exclude from interception.
 * @property {Array<string>} [mask=[]] - Fields to mask in request/response bodies.
 * @property {Function} [beforeLog=null] - Callback for custom processing before logging.
 *   Note: This callback can only modify the `body` of the request and response.
 * @property {Object} [datadogRum=null] - Datadog instance for RUM.
 * @property {Object} [datadogLogs=null] - Datadog instance for Logs (Node.js only).
 * @property {Boolean} [debug=false] - Enable debugging for log outputs.
 */

/**
 * Base function that sets up request interception, trace ID injection, and payload logging.
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
        datadogLogs = null,
        datadogRum = null,
        debug = false,
    } = options || {};

    // Hardcoded exclusion for all datadoghq.com URLs
    const datadogExclusionPattern = /datadoghq\.com/i;

    // Initialize the logger with debug settings
    setLoggerDebug(debug);

    // Combine user-provided excludeUrls with the hardcoded Datadog exclusion
    const combinedExcludeUrls = [
        ...excludeUrls,
        datadogExclusionPattern
    ].filter(isMatchOption); // Ensure all are valid match options

    // Initialize interceptors
    const interceptor = new BatchInterceptor({
        name: 'datadog-rum-interceptor',
        interceptors: environmentInterceptors
    });

    interceptor.apply();


    /**
     * Log the captured request & response data, applying masking and custom processing.
     *
     * @param {Object} request
     * @param {Object} response
     */
    async function logToDatadog(request, response) {
        const url = request.url;
        const traceId = request.headers.get('x-datadog-trace-id') || null;
        console.log(traceId);

        // Parse request and response bodies
        const parsedRequestBody = await parseBody(request.body, request.headers.get('Content-Type') || '');
        const parsedResponseBody = await parseBody(response.body, response.headers.get('Content-Type') || '');

        // Apply masking
        const maskedRequestBody = applyMask(parsedRequestBody, mask);
        const maskedResponseBody = applyMask(parsedResponseBody, mask);

        // Allow custom processing before logging (only body modification)
        let modifiedRequestBody = maskedRequestBody;
        let modifiedResponseBody = maskedResponseBody;

        if (typeof beforeLog === 'function') {
            try {
                const result = await beforeLog(modifiedRequestBody, modifiedResponseBody);
                if (result) {
                    // Ensure only the body is modified
                    if (result.requestBody && typeof result.requestBody === 'object') {
                        modifiedRequestBody = result.requestBody || modifiedRequestBody;
                    }
                    if (result.responseBody && typeof result.responseBody === 'object') {
                        modifiedResponseBody = result.responseBody || modifiedResponseBody;
                    }
                }
            } catch (error) {
                logger.error('Error in beforeLog callback:', error);
            }
        }

        // Retrieve service and env from Datadog RUM config if available
        let service = 'unknown_service';
        let env = 'unknown_env';
        const rumInstance = getDatadogRum(datadogRum);
        if (rumInstance && typeof rumInstance.getInitConfiguration === 'function') {
            const rumConfig = rumInstance.getInitConfiguration();
            service = rumConfig.service || service;
            env = rumConfig.env || env;
        } else {
            logger.warn('Datadog RUM is not initialized or getInitConfiguration is unavailable.');
        }

        // Retrieve service and env from Datadog Logs config if available (Node.js)
        if (isNode() && datadogLogs && typeof datadogLogs.getInitConfiguration === 'function') {
            const logsConfig = datadogLogs.getInitConfiguration();
            service = logsConfig.service || service;
            env = logsConfig.env || env;
        }

        const ddLogs = getDatadogLogs(datadogLogs);

        // Log to Datadog Logs if available
        if (ddLogs?.logger) {
            ddLogs.logger.info('HTTP Intercepted Request/Response', {
                request: {
                    method: request.method,
                    url: url,
                    headers: Object.fromEntries(request.headers.entries()),
                    body: modifiedRequestBody
                },
                response: {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: modifiedResponseBody
                },
                tags: {
                    traceId: traceId,
                    service: service,
                    env: env,
                }
            });
        } else {
            logger.warn("Datadog Logs logger is not available. Skipping log.");
        }
    }

    /**
     * Listen for response events and log them
     */
    interceptor.on('response', async ({ response, request }) => {
        // Early evaluation: Check if the URL should be excluded
        const isExcluded = matchList(combinedExcludeUrls, request.url);
        if (isExcluded) {
            logger.log('Request excluded from tracing:', request.url);
            return; // Skip processing and logging
        }

        // Dynamically retrieve allowedTracingUrls from RUM configuration
        let allowedTracingUrls = [];
        const rumInstance = getDatadogRum();
        if (rumInstance && typeof rumInstance.getInitConfiguration === 'function') {
            const rumConfig = rumInstance.getInitConfiguration();
            allowedTracingUrls = rumConfig?.allowedTracingUrls || [];
            logger.log("Retrieved allowedTracingUrls from RUM configuration:", allowedTracingUrls);
        } else {
            logger.warn('Datadog RUM is not initialized or getInitConfiguration is unavailable.');
        }

        // Check if URL matches any allowedTracingUrls
        const isAllowed = matchList(allowedTracingUrls, request.url, true); // useStartsWith = true
        if (!isAllowed) {
            logger.info('URL not allowed for tracing:', request.url);
            return; // Skip processing
        }

        logger.log("Processing response for URL:", request.url);

        // Clone request and response to safely read their bodies
        const clonedRequest = await request.clone();
        const clonedResponse = await response.clone();

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
