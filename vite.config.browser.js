// vite.config.browser.js
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    resolve: {
        conditions: [],
    },
    build: {
        outDir: 'dist/browser',
        lib: {
            entry: path.resolve(__dirname, 'src/browserIndex.js'),
            name: 'DD_RUM_REQUEST', // Global name for UMD
            fileName: (format) => `datadog-rum-interceptor.browser.${format}.js`,
            formats: ['es', 'umd']
        },
        rollupOptions: {
            external: ['@mswjs/interceptors'],
            output: {
                globals: {
                    '@mswjs/interceptors': 'MSWInterceptors'
                }
            }
        }
    }
})
