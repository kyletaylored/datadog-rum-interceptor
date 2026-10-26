/**
 * @file index.js
 * @description Entry point for the interceptor, exporting the `init` method with enhanced onReady logic.
 */

import { createBaseInterceptor } from './baseInterceptor.js';
import { FetchInterceptor } from '@mswjs/interceptors/fetch';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';

/**
 * Initialize the interceptor with Fetch and XHR interceptors.
 *
 * @param {Object} config - Configuration options for the interceptor.
 * @param {boolean} [config.debug=false] - Enable debug logging.
 * @param {string[]} [config.redactHeaders] - Header names to redact from stored payloads (defaults to common credential headers; pass [] to disable).
 * @returns {{ stop: () => void, getPayload: (beforeSend: { event: Object, context: Object }) => Object|null }}
 */
function init(config = {}) {
    const environmentInterceptors = [
        new FetchInterceptor(),
        new XMLHttpRequestInterceptor(),
    ];

    // Create the interceptor
    const interceptor = createBaseInterceptor(config, environmentInterceptors);

    return interceptor;
}

export default { init };