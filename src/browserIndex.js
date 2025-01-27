/**
 * @file browserIndex.js
 * @description Entry point for the Browser build, exporting the `init` method with enhanced onReady logic.
 */

import { createBaseInterceptor } from './baseInterceptor.js';
import { FetchInterceptor } from '@mswjs/interceptors/fetch';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';

/**
 * Initialize the Browser interceptor with Fetch and XHR interceptors.
 *
 * @param {Object} config - Configuration options for the interceptor.
 * @param {number} [pollInterval=250] - Interval in milliseconds between readiness checks.
 * @param {number} [maxWait=5000] - Maximum time in milliseconds to wait for readiness before bailing out.
 * @returns {{ stop: () => void }}
 */
export function init(config = {}, pollInterval = 250, maxWait = 5000) {
    const environmentInterceptors = [
        new FetchInterceptor(),
        new XMLHttpRequestInterceptor()
    ];

    // Create the interceptor
    const interceptor = createBaseInterceptor(config, environmentInterceptors);

    /**
     * Enhanced onReady method using polling with timeout.
     *
     * @param {Function} callback - The function to execute once RUM and Logs are ready.
     */
    function onReady(callback) {

        let elapsedTime = 0;

        const checkReady = () => {
            const isRUMReady = window.DD_RUM && typeof window.DD_RUM.onReady === 'function';
            const isLogsReady = window.DD_LOGS && typeof window.DD_LOGS.onReady === 'function';

            if (isRUMReady && isLogsReady) {
                // Both RUM and Logs are available, proceed to initialize
                window.DD_RUM.onReady(() => {
                    window.DD_LOGS.onReady(() => {
                        console.log("Datadog RUM and Logs are ready. Interceptor is active.");
                        callback();
                    });
                });
            } else {
                if (elapsedTime >= maxWait) {
                    console.warn(`Datadog RUM and/or Logs did not become ready within ${maxWait}ms. Interceptor may not function correctly.`);
                    callback(); // Proceed without full readiness
                } else {
                    elapsedTime += pollInterval;
                    setTimeout(checkReady, pollInterval);
                }
            }
        };

        checkReady();
    }

    // Execute the callback once RUM and Logs are ready or timeout is reached
    onReady(() => {
        // Interceptor is now active
    });

    return interceptor;
}
