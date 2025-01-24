// test/nodeInterceptor.test.js
const { createNodeInterceptor } = require('../src/nodeIndex.js')

describe('Node Interceptor Tests', () => {
    it('should initialize and stop the Node interceptor without errors', () => {
        // Initialize
        const interceptor = createNodeInterceptor({})
        expect(typeof interceptor.stop).toBe('function')

        // Optionally test some Node http/https usage here...
        // e.g. require('http').request(...)

        // Stop
        interceptor.stop()
    })

    it('should not throw if we call stop multiple times', () => {
        const interceptor = createNodeInterceptor()
        interceptor.stop()
        expect(() => interceptor.stop()).not.toThrow()
    })
})
