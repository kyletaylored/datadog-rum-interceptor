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
 * @returns {{ stop: () => void, getRequestData: (id: string) => Object|undefined }}
 */
export function init(config = {}) {
    const environmentInterceptors = [
        new FetchInterceptor(),
        new XMLHttpRequestInterceptor(),
    ];

    // Create the interceptor
    const interceptor = createBaseInterceptor(config, environmentInterceptors);

    return interceptor;
}
