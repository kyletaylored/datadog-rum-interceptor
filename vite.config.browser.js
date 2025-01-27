// vite.config.browser.js
import { defineConfig } from 'vite'
import path from 'path'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default defineConfig({
    build: {
        // minify: false,
        outDir: 'dist/browser',
        lib: {
            entry: path.resolve(__dirname, 'src/browserIndex.js'),
            name: 'DD_RUM_INTERCEPTOR', // Global name for UMD
            fileName: (format) => `datadog-rum-interceptor.browser.${format}.js`,
            formats: ['es', 'umd']
        },
        rollupOptions: {
            // Externalize Datadog RUM and Logs libraries
            external: [
                '@datadog/browser-rum',
                '@datadog/browser-logs'
            ],
            plugins: [
                nodeResolve({
                    browser: true,
                    mainFields: ['browser', 'module', 'main'],
                    preferBuiltins: false
                }),
                commonjs({
                    transformMixedEsModules: true
                })
            ],
            output: {
                // Define global variables for externalized dependencies in UMD build
                globals: {
                    '@datadog/browser-rum': 'datadogRum',
                    '@datadog/browser-logs': 'datadogLogs'
                },
                format: 'umd',
                name: 'DD_RUM_INTERCEPTOR',
                inlineDynamicImports: true
            }
        }
    }
})
