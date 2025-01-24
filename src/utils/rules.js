// utils/rules.js

/**
 * Utility to check if the given URL matches at least one rule in an array.
 * Each rule can be a string (exact match), RegExp, or function(url => boolean).
 * @param {string} url 
 * @param {Array<string|RegExp|Function>} rules 
 * @returns {boolean}
 */
export function matchesAnyRule(url, rules = []) {
    for (const rule of rules) {
        if (typeof rule === 'string') {
            if (url === rule) return true
        } else if (rule instanceof RegExp) {
            if (rule.test(url)) return true
        } else if (typeof rule === 'function') {
            if (rule(url)) return true
        }
    }
    return false
}

/**
 * Determines if a request URL is allowed based on tracing and exclusion rules.
 *
 * @param {string} url - The URL of the request.
 * @param {Array<string|RegExp|Function>} allowedTracingUrls - Patterns defining which URLs should be traced.
 * @param {Array<string|RegExp|Function>} excludeUrls - Patterns defining which URLs should be excluded.
 * @returns {boolean} - True if the request is allowed; otherwise, false.
 */
export function isRequestAllowed(url, allowedTracingUrls, excludeUrls) {

    // Exclude URLs matching excludeUrls patterns first
    if (matchList(excludeUrls, url)) {
        return false;
    }

    // If allowedTracingUrls are defined, the URL must match at least one
    if (allowedTracingUrls && allowedTracingUrls.length > 0) {
        return matchList(allowedTracingUrls, url, true);
    }

    // If no allowedTracingUrls are defined, allow by default
    return true;
}

/**
 * @typedef {string | RegExp | ((value: string) => boolean)} MatchOption
 */

/**
 * Returns true if the value matches at least one of the provided MatchOptions.
 * When comparing strings, setting useStartsWith to true will compare the value with the start of
 * the option, instead of requiring an exact match.
 *
 * @param {MatchOption[]} list - Array of match options.
 * @param {string} value - The URL to test against the match options.
 * @param {boolean} [useStartsWith=false] - Whether to use startsWith for string comparisons.
 * @returns {boolean}
 */
export function matchList(list, value, useStartsWith = false) {
    return list.some((item) => {
        try {
            if (typeof item === 'function') {
                return item(value);
            } else if (item instanceof RegExp) {
                return item.test(value);
            } else if (typeof item === 'string') {
                return useStartsWith ? value.startsWith(item) : item === value;
            }
        } catch (e) {
            console.error('Error in matchList:', e);
        }
        return false;
    });
}

