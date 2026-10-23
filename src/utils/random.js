import { logger } from './logger';

/**
 * Get headers from request or response object.
 * @param {Headers} headers 
 * @returns 
 */
export function getHeaders(headers) {
    if (!(headers instanceof Headers)) {
        throw new Error('The object provided must be an instance of Headers.');
    }
    const headersObject = {};

    for (const [key, value] of headers.entries()) {
        headersObject[key] = value;
    }

    return headersObject;
}

/**
 * Datadog domains whose traffic (RUM intake, logs, etc.) should never be intercepted.
 * Covers every Datadog site: US1/US3/US5 and AP1/AP2 (datadoghq.com), EU1 (datadoghq.eu), US1-FED (ddog-gov.com).
 */
const DATADOG_DOMAINS = ['datadoghq.com', 'datadoghq.eu', 'ddog-gov.com'];

/**
 * Filter out requests.
 * @param {Request|Response} resource 
 * @returns {boolean} True if the resource should be ignored.
 */
export function filterResource(resource) {
    let hostname;
    try {
        hostname = new URL(resource.url).hostname.toLowerCase();
    } catch (err) {
        return false;
    }

    // Exclude requests to Datadog domains: exact match, subdomains, and browser intake hosts
    // such as browser-intake-datadoghq.com or browser-intake-us3-datadoghq.com.
    return DATADOG_DOMAINS.some((domain) => {
        if (!hostname.endsWith(domain)) return false;
        const prefix = hostname.slice(0, -domain.length);
        return prefix === '' || prefix.endsWith('.') || /(^|\.)browser-intake-([a-z0-9]+-)?$/.test(prefix);
    });
}

/**
 * Header names that are redacted by default before payloads are stored.
 */
export const DEFAULT_REDACTED_HEADERS = [
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'x-csrf-token',
    'x-xsrf-token',
];

export const REDACTED_VALUE = '[REDACTED]';

/**
 * Returns a copy of a headers object with sensitive values replaced.
 * @param {Object} headers - Plain headers object.
 * @param {string[]} redactedHeaders - Header names to redact (case-insensitive).
 * @returns {Object} Headers object with redacted values.
 */
export function redactHeaders(headers, redactedHeaders = DEFAULT_REDACTED_HEADERS) {
    if (!headers || typeof headers !== 'object') return headers;

    const redacted = new Set(redactedHeaders.map((name) => name.toLowerCase()));
    return Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [key, redacted.has(key.toLowerCase()) ? REDACTED_VALUE : value])
    );
}

/**
 * Creates a simple hash.
 * @param {string} str Input string
 * @returns {string} A simple hash of the string
 */
export function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
}

/**
 * Get the Datadog trace ID from the context headers. (fetch only)
 * @param {Object} context - The context object that may contain request headers
 * @returns {string|null} The Datadog trace ID if found, null otherwise
 */
export function getTraceId(context) {
    try {
        if (!context?.requestInit?.headers) {
            return null;
        }

        // Check if headers is an array
        if (!Array.isArray(context.requestInit.headers)) {
            return null;
        }

        const traceIdPair = context.requestInit.headers.find(pair =>
            Array.isArray(pair) && pair[0] === "x-datadog-trace-id"
        );

        return traceIdPair ? traceIdPair[1] : null;
    } catch (error) {
        logger.error('Error getting trace ID:', error);
        return null;
    }
}

/**
 * Builds a data object from a Request or Response.
 * @param {Request|Response} object - The request/response to extract data from.
 * @returns {Promise<Object>} A data object with relevant fields.
 */
export async function buildDataObject(object) {
    const clonedObject = await object.clone();

    return {
        method: 'method' in clonedObject ? clonedObject.method : null, // Only Requests have a method
        headers: getHeaders(clonedObject.headers),
        body: await parseBody(clonedObject.body),
        url: clonedObject.url,
        status: 'status' in clonedObject ? clonedObject.status : null, // Only Responses have a status
        timestamp: Date.now(),
    };
}

/**
 * A universal body parser that works in both Node.js and browser environments.
 * Parses JSON bodies; everything else is returned as trimmed text.
 * @param {ReadableStream | string | Buffer | null} body - The raw body to parse
 * @returns {Promise<unknown>} Returns a parsed object/string based on inferred type
 */
export async function parseBody(body) {
    if (!body) return null;

    // Determine if we're in Node.js environment
    const isNode = typeof process !== 'undefined' &&
        process.versions != null &&
        process.versions.node != null;

    let bodyText;
    try {
        // Convert body to text based on its type
        if (typeof body === 'string') {
            bodyText = body;
        } else if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
            bodyText = await new Response(body).text();
        } else if (isNode && typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
            bodyText = body.toString('utf-8');
        } else {
            logger.warn('Unsupported body type:', typeof body);
            return null;
        }

        const trimmedBody = bodyText.trim();

        // Try parsing as JSON first
        if (trimmedBody.startsWith('{') || trimmedBody.startsWith('[')) {
            try {
                return JSON.parse(trimmedBody);
            } catch (err) {
                logger.warn('Failed to parse JSON body:', err);
                return bodyText; // Return raw text if JSON parsing fails
            }
        }

        return trimmedBody;

    } catch (err) {
        logger.error('Error parsing body:', err);
        return null;
    }
}

/**
 * Converts an XHR response header string into a Headers object.
 * @param {string} rawHeaders - The raw header string from `getAllResponseHeaders()`.
 * @returns {Headers} A Headers object containing the parsed headers.
 */
export function getXhrHeaders(rawHeaders) {
    const headers = new Headers();

    if (!rawHeaders) return headers;

    // Split headers by new lines
    rawHeaders.trim().split(/[\r\n]+/).forEach((line) => {
        const parts = line.split(": ");
        const name = parts.shift().trim();
        const value = parts.join(": ").trim();

        if (name) {
            headers.append(name, value);
        }
    });

    return headers;
}

/**
 * Generates a hash for a JSON object using the `simpleHash` function.
 * Ensures a consistent order by sorting object keys.
 * @param {Object} obj - The JSON object to hash.
 * @returns {string} A 32-character hexadecimal hash.
 */
export function hashJsonObject(obj) {
    if (!obj || typeof obj !== 'object') return '';

    // Recursively sort the object keys
    function sortObject(o) {
        if (Array.isArray(o)) {
            return o.map(sortObject); // Sort each item in an array
        } else if (o !== null && typeof o === 'object') {
            return Object.keys(o)
                .sort()
                .reduce((acc, key) => {
                    acc[key] = sortObject(o[key]); // Recursively sort nested objects
                    return acc;
                }, {});
        }
        return o; // Return primitive values as-is
    }

    // Convert the sorted object to a JSON string
    const jsonString = JSON.stringify(sortObject(obj));

    // Generate hash using the available simpleHash function
    return simpleHash(jsonString);
}