/**
 * @file interceptors.js
 * @description Core functionality to intercept requests, capture data, and forward them to Datadog.
 */

import { BatchInterceptor } from '@mswjs/interceptors'
import { datadogLogs } from '@datadog/browser-logs'

// Node interceptors
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'

// Browser interceptors
import { FetchInterceptor } from '@mswjs/interceptors/fetch'

const nodeInterceptors = [
    new ClientRequestInterceptor(),
    new XMLHttpRequestInterceptor(),
]

const browserInterceptors = [
    new FetchInterceptor(),
    new XMLHttpRequestInterceptor(),
]

export function createRequestInterceptor(options) {
    const {
        datadogLogsConfig,
        enableRumIntegration = false,
        rumGlobalVarName = 'DD_RUM'
    } = options || {}

    // Initialize Datadog Browser Logs in a browser environment only
    if (typeof window !== 'undefined') {
        if (!datadogLogsConfig || !datadogLogsConfig.clientToken || !datadogLogsConfig.site) {
            console.warn('[datadog-rum-interceptor]: Missing or invalid Datadog config for browser environment.')
        } else {
            datadogLogs.init({
                clientToken: datadogLogsConfig.clientToken,
                site: datadogLogsConfig.site,
                forwardErrorsToLogs: datadogLogsConfig.forwardErrorsToLogs ?? true,
                sessionSampleRate: datadogLogsConfig.sessionSampleRate ?? 100
            })
        }
    }

    // Choose interceptors based on environment
    const environmentInterceptors = (typeof window === 'undefined')
        ? nodeInterceptors  // Node
        : browserInterceptors // Browser

    // Create the batch interceptor
    const interceptor = new BatchInterceptor({
        name: 'datadog-rum-interceptor',
        interceptors: environmentInterceptors
    })

    interceptor.apply()

    /**
     * Helper to log the captured request and response data to Datadog.
     * If RUM is available and enabled, attach attributes to RUM events.
     *
     * @param {Object} request - Original request info
     * @param {Object} response - Response info
     */
    function logToDatadog(request, response) {
        // Attempt to retrieve trace ID from request headers
        const traceId = request?.headers?.['x-datadog-trace-id'] || null

        // Send logs to Datadog Logs (in browser)
        if (typeof window !== 'undefined' && datadogLogs) {
            datadogLogs.logger.info('HTTP Intercepted Request/Response', {
                // Basic data
                requestMethod: request.method,
                requestUrl: request.url,
                requestBody: request.body,
                responseStatus: response.status,
                responseBody: response.body,
                // Trace correlation
                traceId
            })
        }

        // If RUM is enabled and available, attach custom attributes
        if (enableRumIntegration && typeof window !== 'undefined') {
            const rumGlobal = window[rumGlobalVarName]
            if (rumGlobal && typeof rumGlobal.addAction === 'function') {
                rumGlobal.addAction('intercepted_request', {
                    method: request.method,
                    url: request.url,
                    traceId,
                    responseStatus: response.status
                })
            }
        }
    }

    /**
     * Listen for requests before they are sent
     */
    interceptor.on('request', (request) => {
        // request object includes:
        //   - request.method
        //   - request.url
        //   - request.body (string or undefined)
        //   - request.headers (object)
        // You can store or modify request data here if desired
    })

    /**
     * Listen for responses
     */
    interceptor.on('response', async (response) => {
        // response object includes:
        //   - response.status
        //   - response.body (string, JSON, or undefined)
        //   - response.request (the original request object)
        //   - response.headers (object)
        // Use the request info to correlate with the response
        logToDatadog(response.request, response)
    })

    /**
     * Stop function to disable the interceptor.
     */
    function stop() {
        interceptor.dispose()
    }

    return { stop }
}