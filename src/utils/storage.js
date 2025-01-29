/**
 * @file storage.js
 * @description In-memory storage for intercepted requests and responses.
 */

import { logger } from './logger';
import { simpleHash, hashJsonObject } from './random';

const interceptedRequests = new Map(); // Temporary storage for requests (keyed by requestId)
const interceptedResponses = new Map(); // Stores final responses
const EXPIRATION_TIME_MS = 5000; // Auto-remove unmatched responses after 5s

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
}

/**
 * Retrieves and removes response data by trace ID or fingerprint.
 * @param {string} id - The trace ID or fingerprint.
 * @returns {Object|null} The stored data, or null if not found.
 */
export function getInterceptedData(id) {
    const data = interceptedResponses.get(id);
    interceptedResponses.delete(id);
    return data || null;
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

        // Fallback to simple hash if neither is available
        const fingerprint = simpleHash(fingerprintString);
        logger.log(`Debug fingerprint (${context}):`, { data, fingerprintString, fingerprint });
        return fingerprint;

    } catch (error) {
        logger.error('Error generating fingerprint:', error);
        return null;
    }
}