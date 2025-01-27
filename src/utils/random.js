/**
 * Determine if the environment is Node.js.
 *
 * @returns {boolean}
 */
export function isNode() {
    return (
        typeof process !== 'undefined' &&
        process.versions != null &&
        process.versions.node != null
    );
}

/**
 * Safely access the Datadog RUM instance.
 *
 * @returns {Object|null}
 */
export function getDatadogRum(datadogRum) {
    if (isNode()) {
        return datadogRum;
    } else if (typeof window !== 'undefined' && window.DD_RUM) {
        return window.DD_RUM;
    }
    return null;
}

/**
 * Safely access the Datadog Logs instance.
 *
 * @returns {Object|null}
 */
export function getDatadogLogs(datadogLogs) {
    if (isNode()) {
        return datadogLogs;
    } else if (typeof window !== 'undefined' && window.DD_LOGS) {
        return window.DD_LOGS;
    }
    return null;
}

/**
 * Get status code as text.
 * @param {*} code 
 * @returns 
 */
export function statusCodeToMessage(code) {
    switch (Math.floor(code / 100)) {
        case 1:
        case 2:
        case 3:
            return "info";
        case 4:
            return "warn";
        case 5:
            return "error";
        default:
            return "debug";
    }
}

/**
 * Get headers from request or response object.
 * @param {*} fetchObj 
 * @returns 
 */
export function getHeadersObject(fetchObj) {
    if (!(fetchObj instanceof Request || fetchObj instanceof Response)) {
        throw new Error('The object provided must be an instance of Request or Response.');
    }

    const headers = fetchObj.headers;
    const headersObject = {};

    for (const [key, value] of headers.entries()) {
        headersObject[key] = value;
    }

    return headersObject;
}
