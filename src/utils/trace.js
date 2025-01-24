/**
 * Caches the identifier creation implementation to avoid repeated feature checks.
 * Initialized as null and set upon the first invocation of createIdentifier.
 */
let createIdentifierImplementationCache = null;

/**
 * Creates a 63-bit or 64-bit identifier based on environment capabilities.
 * If BigInt is supported and the experimental feature is enabled, it uses BigInt.
 * Otherwise, it falls back to using Uint32Array.
 *
 * @param {number} bits - Must be either 63 or 64.
 * @returns {BigInt|Object} Returns a BigInt if supported, or an object with a custom `toString` method.
 */
function createIdentifier(bits) {
    if (!createIdentifierImplementationCache) {
        // Determine which implementation to use based on feature support
        const isConsistentTraceSamplingEnabled = isExperimentalFeatureEnabled('CONSISTENT_TRACE_SAMPLING');
        const bigIntSupported = areBigIntIdentifiersSupported();

        createIdentifierImplementationCache =
            isConsistentTraceSamplingEnabled && bigIntSupported
                ? createIdentifierUsingBigInt
                : createIdentifierUsingUint32Array;
    }

    return createIdentifierImplementationCache(bits);
}

/**
 * Checks if BigInt-based identifiers are supported in the current environment.
 *
 * @returns {boolean} True if BigInt is supported, false otherwise.
 */
function areBigIntIdentifiersSupported() {
    try {
        // Attempt to create a BigUint64Array using crypto.getRandomValues
        crypto.getRandomValues(new BigUint64Array(1));
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Placeholder function to check if an experimental feature is enabled.
 * Replace this with your actual feature flag implementation.
 *
 * @param {string} feature - The feature to check.
 * @returns {boolean} True if the feature is enabled, false otherwise.
 */
function isExperimentalFeatureEnabled(feature) {
    // TODO: Implement your feature flag logic here
    // For demonstration, we'll return false to use the fallback
    return false;
}

/**
 * Creates an identifier using BigInt.
 * Generates a random BigInt and ensures it's 63 bits if specified.
 *
 * @param {number} bits - Must be either 63 or 64.
 * @returns {BigInt} A randomly generated BigInt identifier.
 */
function createIdentifierUsingBigInt(bits) {
    const randomBigIntArray = new BigUint64Array(1);
    crypto.getRandomValues(randomBigIntArray);
    let id = randomBigIntArray[0];

    if (bits === 63) {
        // Shift right by 1 to ensure the identifier is 63 bits
        id >>= BigInt(1);
    }

    return id;
}

/**
 * Creates an identifier using Uint32Array as a fallback when BigInt is not supported.
 * Provides a custom `toString` method for base conversion.
 *
 * @param {number} bits - Must be either 63 or 64.
 * @returns {Object} An object with a custom `toString` method.
 */
function createIdentifierUsingUint32Array(bits) {
    const buffer = crypto.getRandomValues(new Uint32Array(2));

    if (bits === 63) {
        // Force the highest bit to ensure a 63-bit identifier
        buffer[1] >>>= 1;
    }

    return {
        /**
         * Converts the 64-bit (or 63-bit) identifier to a string in the specified radix.
         *
         * @param {number} [radix=10] - The base for conversion (e.g., 2, 10, 16).
         * @returns {string} The identifier as a string in the specified radix.
         */
        toString(radix = 10) {
            let high = buffer[1];
            let low = buffer[0];
            let result = '';

            // Convert the identifier to the specified radix by dividing and taking modulus
            do {
                const mod = (high % radix) * 4294967296 + low;
                high = Math.floor(high / radix);
                low = Math.floor(mod / radix);
                result = (mod % radix).toString(radix) + result;
            } while (high || low);

            return result;
        },
    };
}

// Exporting the createIdentifier function for use in other modules
// This uses ES6 module syntax. If you're using CommonJS (e.g., in Node.js), use `module.exports` instead.
export { createIdentifier };

// Example Usage:
// Uncomment the lines below to test the functionality in your environment.

// const id64 = createIdentifier(64);
// console.log(id64 instanceof BigInt ? id64.toString() : id64.toString(10));

// const id63 = createIdentifier(63);
// console.log(id63 instanceof BigInt ? id63.toString() : id63.toString(10));
