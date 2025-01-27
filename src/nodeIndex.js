/**
 * @file nodeIndex.js
 * @description Entry for the Node build, importing ClientRequest and XHR interceptors.
 */

import { createBaseInterceptor } from './baseInterceptor.js';
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';
import { datadogLogs } from '@datadog/browser-logs'; // Externalized
import { datadogRum } from '@datadog/browser-rum';   // Externalized

/**
 * Initialize the Node.js interceptor with ClientRequest and XHR interceptors.
 *
 * @param {Object} options - Interceptor options.
 * @returns {{ stop: () => void }}
 */
export function init(options = {}) {
    const environmentInterceptors = [
        new ClientRequestInterceptor(),
        new XMLHttpRequestInterceptor()
    ];

    return createBaseInterceptor({
        ...options,
        datadogLogs,
        datadogRum
    }, environmentInterceptors);
}
