/**
 * @file storage.js
 * @description In-memory storage for intercepted requests and responses.
 */
const { logger } = require('./logger');

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
 * Creates a simple hash.
 * @param {string} str Input string
 * @returns {string} A simple hash of the string
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
}

/**
 * Generates a fingerprint for response matching.
 * @param {Object} responseData - Response data (method, URL, status, timestamp).
 * @param {string} context - An optional context for logging.
 * @returns {Promise<string|null>} A fingerprint ID.
 */
export function generateResponseFingerprint(responseData, context = 'default') {
    if (!responseData) return null;

    try {
        const method = responseData.method || 'GET';
        const url = responseData.url || '';
        const status = responseData.status || 200;
        const timestamp = Math.floor(responseData.timestamp / 1000); // Round to seconds

        // Generate a stable fingerprint hash
        const fingerprintString = `${method}:${url}:${status}:${timestamp}`;
        
        // Fallback to simple hash if neither is available
        const fingerprint = simpleHash(fingerprintString);
        logger.log(`Debug fingerprint (${context}):`, {responseData, fingerprintString, fingerprint});
        return fingerprint;

    } catch (error) {
        logger.error('Error generating fingerprint:', error);
        return null;
    }
}