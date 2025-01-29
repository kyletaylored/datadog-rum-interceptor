/**
 * @file nodeIndex.js
 * @description Entry for the Node build, importing ClientRequest and XHR interceptors.
 */

import { createBaseInterceptor } from './baseInterceptor.js';
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';

/**
 * Initialize the Node.js interceptor with ClientRequest and XHR interceptors.
 *
 * @param {Object} options - Interceptor options.
 * @returns {{ stop: () => void, getRequestData: (id: string) => Object|undefined }}
 */
export function init(options = {}) {
    const environmentInterceptors = [
        new ClientRequestInterceptor(),
        new XMLHttpRequestInterceptor(),
    ];

    return createBaseInterceptor(
        {
            ...options,
        },
        environmentInterceptors
    );
}
