// baseInterceptor.js
import { BatchInterceptor } from '@mswjs/interceptors'

/**
 * @typedef {Object} InterceptorOptions
 * @property {boolean} [enableRumIntegration=false] - whether to attach RUM custom attributes
 * @property {string}  [rumGlobalVarName='DD_RUM']  - global variable name for RUM
 * // ...
 */

/**
 * Base function that takes an array of interceptors (Node or Browser)
 * and sets up logging logic. 
 *
 * @param {InterceptorOptions} options - user config
 * @param {import('@mswjs/interceptors').Interceptor[]} environmentInterceptors - environment-specific interceptors
 * @returns {{ stop: () => void }}
 */
export function createBaseInterceptor(options, environmentInterceptors) {
    const {
        enableRumIntegration = false,
        rumGlobalVarName = 'DD_RUM'
    } = options || {}

    const isBrowser = typeof window !== 'undefined'
    // If you want to detect external logs or rum (window.DD_LOGS / window.DD_RUM),
    // do it here. Example:
    const ddLogs = isBrowser ? window.DD_LOGS : null
    const ddRum = isBrowser ? window[rumGlobalVarName] : null

    // Create the batch interceptor
    const interceptor = new BatchInterceptor({
        name: 'datadog-rum-interceptor',
        interceptors: environmentInterceptors
    })

    interceptor.apply()

    /**
     * Helper to log the captured request & response data.
     */
    function logToDatadog(request, response) {
        const traceId = request?.headers?.['x-datadog-trace-id'] || null

        // If Datadog Logs is present
        if (ddLogs && ddLogs.logger) {
            ddLogs.logger.info('HTTP Intercepted Request/Response', {
                requestMethod: request.method,
                requestUrl: request.url,
                requestBody: request.body,
                responseStatus: response.status,
                responseBody: response.body,
                traceId
            })
        }

        // If RUM is enabled
        if (enableRumIntegration && ddRum && typeof ddRum.addAction === 'function') {
            ddRum.addAction('intercepted_request', {
                method: request.method,
                url: request.url,
                traceId,
                responseStatus: response.status
            })
        }
    }

    // Listen for requests
    interceptor.on('request', (request) => {
        // ...
    })

    // Listen for responses
    interceptor.on('response', async (response) => {
        logToDatadog(response.request, response)
    })

    function stop() {
        interceptor.dispose()
    }

    return { stop }
}
