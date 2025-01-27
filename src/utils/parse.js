const { logger } = require('./logger');

/**
 * Attempt to parse a request/response body based on the Content-Type header.
 * @param {ReadableStream | string | Buffer | null} body - The raw body.
 * @param {string} [contentType] - The Content-Type header value, e.g. "application/json"
 * @returns {Promise<unknown>} Returns a parsed object/string/DOM/etc. if possible
 */
export async function parseBody(body, contentType = '') {
    if (!body) return null;

    let bodyText = '';

    // 1. Convert body to text based on its type
    if (typeof body === 'string') {
        bodyText = body;
    } else if (body instanceof ReadableStream) {
        bodyText = await new Response(body).text();
    }
    // Node scenario: Buffer
    else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
        bodyText = body.toString('utf-8');
    }
    // Add more checks as needed for other environments or types

    // 2. Determine parsing strategy based on Content-Type
    const lowerCT = contentType.toLowerCase();

    // - JSON
    if (lowerCT.includes('json')) {
        try {
            return JSON.parse(bodyText);
        } catch (err) {
            // Fallback: return raw text if JSON parse fails
            logger.warn('Failed to parse JSON:', err);
            return bodyText;
        }
    }

    // - XML
    else if (lowerCT.includes('xml')) {
        // Parse as XML/HTML via DOMParser in the browser:
        if (typeof window !== 'undefined' && window.DOMParser) {
            try {
                const parser = new window.DOMParser();
                const xmlDoc = parser.parseFromString(bodyText, 'text/xml');
                return xmlDoc;
            } catch (err) {
                logger.warn('Failed to parse XML:', err);
                return bodyText;
            }
        }
        // Node.js: Use DOMParser alternative or return raw text
        // For simplicity, return raw text
        return bodyText;
    }

    // - Add more content types as needed:
    //   e.g., "text/html", "application/x-www-form-urlencoded", etc.

    // Default fallback: plain text
    return bodyText;
}

/**
 * Mask sensitive fields in the body based on the `mask` configuration.
 *
 * @param {any} body - The request or response body.
 * @param {Array<string>} mask - The list of fields to mask.
 * @returns {any} - The masked body.
 */
export function applyMask(body, mask) {
    if (typeof body === 'object' && body !== null) {
        const copy = Array.isArray(body) ? [...body] : { ...body };
        mask.forEach((field) => {
            if (copy.hasOwnProperty(field)) {
                copy[field] = '***REDACTED***';
            }
        });
        return copy;
    }
    return body;
}
