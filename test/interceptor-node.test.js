// test/interceptor-node.test.js

import { createRequestInterceptor } from '../src/interceptors'
import { datadogLogs } from '@datadog/browser-logs'

// Mock the datadogLogs so we can verify calls in tests
jest.mock('@datadog/browser-logs', () => ({
    datadogLogs: {
        init: jest.fn(),
        logger: {
            info: jest.fn()
        }
    }
}))

describe('Node environment tests (default)', () => {
    it('should apply the interceptor and stop it without errors', () => {
        // Since there's no window, the library picks "nodeInterceptors"
        const interceptorController = createRequestInterceptor({
            datadogLogsConfig: {
                clientToken: 'node_test_token',
                site: 'datadoghq.com'
            }
        })

        expect(typeof interceptorController.stop).toBe('function')

        // Because "typeof window === 'undefined'", we expect NO browser logs init
        expect(datadogLogs.init).not.toHaveBeenCalled()

        interceptorController.stop()
    })
})
