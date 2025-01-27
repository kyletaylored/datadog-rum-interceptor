// Assuming you have a logger module with an 'error' method
const { logger } = require('./logger');

/**
 * Similar to `typeof`, but distinguish plain objects from `null` and arrays
 */
function getType(value) {
    if (value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    return typeof value;
}

/**
 * Determines if a given item is a MatchOption: a string, RegExp, or a function
 */
function isMatchOption(item) {
    const itemType = getType(item);
    return itemType === 'string' || itemType === 'function' || item instanceof RegExp;
}

/**
 * Returns true if value can be matched by at least one of the provided MatchOptions.
 * When comparing strings, setting useStartsWith to true will compare the value with the start of
 * the option, instead of requiring an exact match.
 */
function matchList(list, value, useStartsWith = false) {
    logger.log({ list, value, useStartsWith });
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
            logger.error(e);
        }
        return false;
    });
}

export { getType, isMatchOption, matchList };