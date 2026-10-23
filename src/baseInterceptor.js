import { BatchInterceptor } from '@mswjs/interceptors';
import { setLoggerDebug, logger } from './utils/logger';
import { storeInterceptedData, getInterceptedData, storeTemporaryRequest, getAndRemoveTemporaryRequest, generateResponseFingerprint, clearInterceptedData } from './utils/storage';
import { getTraceId, buildDataObject, filterResource, getXhrHeaders, getHeaders, redactHeaders, DEFAULT_REDACTED_HEADERS } from './utils/random';

/**
 * Base function that sets up request and response interception.
 *
 * @param {Object} options - Configuration options.
 * @param {import('@mswjs/interceptors').Interceptor[]} environmentInterceptors
 * @returns {{ stop: () => void, getPayload: (context: object) => object }}
 */
export function createBaseInterceptor(options, environmentInterceptors) {
    const { debug = false, redactHeaders: redactedHeaders = DEFAULT_REDACTED_HEADERS } = options || {};

    setLoggerDebug(debug);

    const interceptor = new BatchInterceptor({
        name: 'datadog-rum-interceptor',
        interceptors: environmentInterceptors,
    });

    interceptor.apply();

    /**
     * Listen for request events and store them using requestId.
     */
    interceptor.on('request', async ({ request, requestId }) => {
        // Filter out requests
        if (filterResource(request)) {
            return;
        }

        // Store request temporarily using requestId
        const requestData = {
            method: request.method,
            url: request.url,
            headers: Object.fromEntries(request.headers.entries()),
            timestamp: Date.now(),
        };

        storeTemporaryRequest(requestId, requestData);
        logger.log(`Intercepted Request: ${request.url}`, requestData);
    });

    /**
     * Listen for response events and match with stored requests.
     */
    interceptor.on('response', async ({ request, response, requestId }) => {
        // Filter out requests
        if (filterResource(request)) {
            return;
        }

        // Retrieve the stored request using requestId
        const requestData = getAndRemoveTemporaryRequest(requestId);
        if (!requestData) {
            logger.warn(`No matching request found for response: ${response.url}`);
            return;
        }

        // Build the response data object.
        const responseData = await buildDataObject(response);
        // Merge requestData into responseData, only filling in null values.
        Object.keys(responseData).forEach((key) => {
            if ((responseData[key] === null || responseData[key] === "") && requestData[key] !== undefined) {
                responseData[key] = requestData[key];
            }
        });

        // Use trace ID if available, otherwise generate a fingerprint
        const id = request.headers.get('x-datadog-trace-id') ?? generateResponseFingerprint(responseData, 'interceptor ');

        // Store the combined request-response data, redacting sensitive headers.
        // Redaction happens after fingerprinting so IDs still match the unredacted headers seen by getPayload.
        const storedData = {
            request: { ...requestData, headers: redactHeaders(requestData.headers, redactedHeaders) },
            response: { ...responseData, headers: redactHeaders(responseData.headers, redactedHeaders) },
        };
        storeInterceptedData(id, storedData);

        logger.log(`Intercepted Response: ${response.url}`, storedData);
    });

    /**
     * Retrieves the payload data for a given Datadog RUM event and context.
     * @param {Object} beforeSend - The object containing Datadog RUM `event` and `context`.
     * @returns {Object|null} The extracted payload data or null if no match.
     */
    function getPayload(beforeSend) {
        if (!beforeSend || typeof beforeSend !== 'object') {
            console.warn('Invalid beforeSend object provided.');
            return null;
        }

        // Extract the event and context from the beforeSend object.
        const { event, context } = beforeSend;
        if (!event || !context) {
            console.warn('Both `event` and `context` are required.');
            return null;
        }

        try {
            // Check if XHR or Fetch event. Failed requests may have no response/xhr, so fall back to empty headers.
            const isXHR = event.resource?.type === 'xhr';
            const rawHeaders = isXHR ? getXhrHeaders(context.xhr?.getAllResponseHeaders?.()) : context.response?.headers;
            const headers = rawHeaders instanceof Headers ? rawHeaders : new Headers();

            // Get the trace ID from the context headers or generate a fingerprint.
            const id = getTraceId(context) ?? generateResponseFingerprint({
                method: event.resource?.method || 'GET',
                url: event.resource?.url || "",
                status: event.resource?.status_code || "",
                timestamp: event.date || Date.now(),
                headers: getHeaders(headers),
            }, 'extractor');

            // Retrieve the stored data using the trace ID or fingerprint.
            const data = getInterceptedData(id);

            // Log a warning if no match is found.
            if (!data) {
                logger.warn('No match found for request:', context);
            }

            return data;
        } catch (err) {
            logger.error('Failed to extract resource data:', err);
            return null;
        }
    }

    function stop() {
        interceptor.dispose();
        clearInterceptedData();
        logger.info('Interceptor stopped.');
    }

    return {
        stop,
        getPayload,
    };
}
