// logger.js
/**
 * Creates a debug logger that proxies console methods with optional output suppression
 * @param {boolean} debug - Whether debug logging is enabled
 * @returns {ProxyHandler} Proxy wrapping console methods
 */
function createLogger(debug = false) {
    return new Proxy(console, {
        get: (target, prop) => (...args) => debug && target[prop]?.('[Datadog Interceptor]:', ...args)
    });
}

let isDebugEnabled = false;

/**
 * Update the debug logger settings
 * @param {boolean} debug - Whether to enable debug logging
 */
export function setLoggerDebug(debug) {
    isDebugEnabled = debug;
}

/**
 * Export the logger as a proxy that checks isDebugEnabled on each call
 * @type {ProxyHandler}
 */
export const logger = new Proxy(console, {
    get: (target, prop) => (...args) =>
        isDebugEnabled && target[prop]?.('[Datadog Interceptor]:', ...args)
});