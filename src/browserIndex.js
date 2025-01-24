/**
 * @file browserIndex.js
 * @description Entry for the browser build, importing Fetch and XHR interceptors.
 */

import { createBaseInterceptor } from './baseInterceptor.js'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'

/**
 * Create a browser interceptor with Fetch and XHR interceptors.
 *
 * @param {Object} options - Interceptor options.
 * @returns {{ stop: () => void }}
 */
export function createBrowserInterceptor(options = {}) {
    const environmentInterceptors = [
        new FetchInterceptor(),
        new XMLHttpRequestInterceptor()
    ]

    // Automatically pass Datadog instances from globals
    const datadogLogs = window.datadogLogs
    const datadogRum = window.datadogRum

    return createBaseInterceptor({
        ...options,
        datadogLogs,
        datadogRum
    }, environmentInterceptors)
}
