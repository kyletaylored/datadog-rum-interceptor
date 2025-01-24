// test/browserInterceptor.test.js
/**
 * @jest-environment jsdom
 */

const { createBrowserInterceptor } = require('../src/browserIndex.js')

describe('Browser Interceptor Tests', () => {
    it('should initialize and stop the Browser interceptor without errors', () => {
        // In a jsdom environment, window is defined
        expect(typeof window).toBe('object')

        const interceptor = createBrowserInterceptor({

        })
        expect(typeof interceptor.stop).toBe('function')

        // e.g., you could do a fetch or XHR test if you mock them
        interceptor.stop()
    })

    it('should not throw if we stop before any request is made', () => {
        const interceptor = createBrowserInterceptor()
        interceptor.stop()
        // Stopping again no-ops or warns
        expect(() => interceptor.stop()).not.toThrow()
    })
})
