// browserIndex.js
const { createBaseInterceptor } = require('./baseInterceptor.js')
const { FetchInterceptor } = require('@mswjs/interceptors/fetch')
const { XMLHttpRequestInterceptor } = require('@mswjs/interceptors/XMLHttpRequest')

/**
 * Create the browser-specific request interceptor.
 * @param {object} [options]
 * @returns {{ stop: () => void }}
 */
export function createBrowserInterceptor(options) {
    const environmentInterceptors = [
        new FetchInterceptor(),
        new XMLHttpRequestInterceptor()
    ]

    return createBaseInterceptor(options, environmentInterceptors)
}
