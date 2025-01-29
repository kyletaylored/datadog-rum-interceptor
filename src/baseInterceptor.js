import { BatchInterceptor } from '@mswjs/interceptors';
import { setLoggerDebug, logger } from './utils/logger';
import { storeInterceptedData, getInterceptedData, storeTemporaryRequest, getAndRemoveTemporaryRequest, generateResponseFingerprint } from './utils/storage';
import { getTraceId, buildDataObject, filterResource } from './utils/random';

/**
 * Base function that sets up request and response interception.
 *
 * @param {Object} options - Configuration options.
 * @param {import('@mswjs/interceptors').Interceptor[]} environmentInterceptors
 * @returns {{ stop: () => void, getPayload: (context: object) => object }}
 */
export function createBaseInterceptor(options, environmentInterceptors) {
    const { debug = false } = options || {};

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
        logger.log({requestData})

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

        // Store the combined request-response data
        const storedData = { request: requestData, response: responseData };
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

        const { event, context } = beforeSend;

        if (!event || !context) {
            console.warn('Both `event` and `context` are required.');
            return null;
        }

        try {
            // Get the trace ID from the context headers or generate a fingerprint.
            const id = getTraceId(context) ?? generateResponseFingerprint({
                method: event.resource?.method || 'GET',
                url: event.resource?.url || "",
                status: event.resource?.status_code || "",
                timestamp: event.date || Date.now(),
            }, 'extractor');

            // Retrieve the stored data using the trace ID or fingerprint.
            const responseData = getInterceptedData(id);

            // Log a warning if no match is found.
            if (!responseData) {
                logger.warn('No match found for request:', context);
            }

            // Add resource type for clarity.
            responseData.type = event.resource.type = 'resource';

            return responseData;
        } catch (err) {
            logger.error('Failed to extract resource data:', err);
            return null;
        }
    }

    function stop() {
        interceptor.dispose();
        logger.info('Interceptor stopped.');
    }

    return {
        stop,
        getPayload,
    };
}
