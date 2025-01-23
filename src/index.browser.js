/**
 * @file index.browser.js
 * @description Exports for browser usage.
 */

import { createRequestInterceptor } from './interceptors.js'

export { createRequestInterceptor }

// Global browser exposure
if (typeof window !== 'undefined') {
    window.DDRumInterceptor = {
        createRequestInterceptor
    }
}