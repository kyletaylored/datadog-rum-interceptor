// nodeIndex.js
import { createBaseInterceptor } from './baseInterceptor.js'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'

/**
 * Create the Node-specific request interceptor.
 * @param {object} [options]
 * @returns {{ stop: () => void }}
 */
export function createNodeInterceptor(options) {
    const environmentInterceptors = [
        new ClientRequestInterceptor(),
        new XMLHttpRequestInterceptor()
    ]

    return createBaseInterceptor(options, environmentInterceptors)
}
