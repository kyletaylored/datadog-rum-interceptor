// test/interceptor-browser.test.js

/**
 * @jest-environment jsdom
 */

import { createRequestInterceptor } from '../interceptors.js'
import { datadogLogs } from '@datadog/browser-logs'

// Global browser exposure
if (typeof window !== 'undefined') {
    window.DDRumInterceptor = {
        createRequestInterceptor
    }
}

// Mock datadogLogs as well
jest.mock('@datadog/browser-logs', () => ({
    datadogLogs: {
        init: jest.fn(),
        logger: {
            info: jest.fn()
        }
    }
}))

describe('Browser environment tests (jsdom)', () => {
    it('should call datadogLogs.init with config in a browser-like environment', () => {
        // Now "window" is defined by jsdom, so the code sees the "browserInterceptors"
        const interceptorController = createRequestInterceptor({
            datadogLogsConfig: {
                clientToken: 'test_token',
                site: 'datadoghq.com'
            }
        })

        // If site + clientToken are present, it should call init
        expect(datadogLogs.init).toHaveBeenCalledWith({
            clientToken: 'test_token',
            site: 'datadoghq.com',
            forwardErrorsToLogs: true,
            sessionSampleRate: 100
        })

        interceptorController.stop()
    })

    it('should warn if config is missing in a browser environment', () => {
        // Expect a console.warn message if no clientToken/site
        const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => { })

        const interceptorController = createRequestInterceptor({})
        interceptorController.stop()

        expect(spyWarn).toHaveBeenCalledWith(
            '[datadog-rum-interceptor]: Missing or invalid Datadog config for browser environment.'
        )

        spyWarn.mockRestore()
    })
})
