/**
 * @file storage.js
 * @description In-memory storage for intercepted requests and responses.
 */

import { logger } from './logger';
import { simpleHash, hashJsonObject } from './random';

const interceptedRequests = new Map(); // Temporary storage for requests (keyed by requestId)
const interceptedResponses = new Map(); // Stores final responses (keyed by trace ID or fingerprint)
const EXPIRATION_TIME_MS = 5000; // Auto-remove unmatched requests after 5s
const RESPONSE_EXPIRATION_TIME_MS = 30000; // Auto-remove unclaimed responses after 30s
const responseTimers = new Map(); // Expiration timers for stored responses

/**
 * Stores a request temporarily using the requestId provided by the interceptor.
 * @param {string} requestId - The request identifier.
 * @param {Object} requestData - The request data to store.
 */
export function storeTemporaryRequest(requestId, requestData) {
    interceptedRequests.set(requestId, requestData);

    // Auto-remove after EXPIRATION_TIME_MS
    setTimeout(() => {
        interceptedRequests.delete(requestId);
    }, EXPIRATION_TIME_MS);
}

/**
 * Retrieves and removes a stored request using the requestId.
 * @param {string} requestId - The request identifier.
 * @returns {Object|null} The stored request data, or null if not found.
 */
export function getAndRemoveTemporaryRequest(requestId) {
    const storedRequest = interceptedRequests.get(requestId);
    interceptedRequests.delete(requestId); // Remove after access
    return storedRequest || null;
}

/**
 * Stores a response permanently using a trace ID.
 * @param {string} id - The trace ID or fingerprint.
 * @param {Object} data - The response data.
 */
export function storeInterceptedData(id, data) {
    interceptedResponses.set(id, data);

    // Reset any existing timer so a re-stored ID gets a full window
    clearTimeout(responseTimers.get(id));

    // Auto-remove after RESPONSE_EXPIRATION_TIME_MS so unclaimed payloads don't accumulate
    responseTimers.set(id, setTimeout(() => {
        interceptedResponses.delete(id);
        responseTimers.delete(id);
    }, RESPONSE_EXPIRATION_TIME_MS));
}

/**
 * Retrieves and removes response data by trace ID or fingerprint.
 * @param {string} id - The trace ID or fingerprint.
 * @returns {Object|null} The stored data, or null if not found.
 */
export function getInterceptedData(id) {
    const data = interceptedResponses.get(id);
    interceptedResponses.delete(id);
    clearTimeout(responseTimers.get(id));
    responseTimers.delete(id);
    return data || null;
}

/**
 * Clears all stored requests and responses.
 */
export function clearInterceptedData() {
    interceptedRequests.clear();
    interceptedResponses.clear();
    responseTimers.forEach((timer) => clearTimeout(timer));
    responseTimers.clear();
}

/**
 * Generates a fingerprint for response matching.
 * @param {Object} data - Response data (method, URL, status, timestamp).
 * @param {string} context - An optional context for logging.
 * @returns {Promise<string|null>} A fingerprint ID.
 */
export function generateResponseFingerprint(data, context = 'default') {
    if (!data) return null;

    try {
        const method = data.method || 'GET';
        const url = data.url || '';
        const status = data.status || 200;
        const timestamp = Math.floor(data.timestamp / 10000); // Round to 10 seconds
        const headers = hashJsonObject(data.headers) || '';

        // Generate a stable fingerprint hash
        const fingerprintString = `${method}:${url}:${status}:${headers}:${timestamp}`;

        const fingerprint = simpleHash(fingerprintString);
        logger.log(`Debug fingerprint (${context}):`, { data, fingerprintString, fingerprint });
        return fingerprint;

    } catch (error) {
        logger.error('Error generating fingerprint:', error);
        return null;
    }
}