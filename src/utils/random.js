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