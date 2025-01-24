// vite.config.browser.js
import { defineConfig } from 'vite'
import path from 'path'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default defineConfig({
    build: {
        outDir: 'dist/browser',
        lib: {
            entry: path.resolve(__dirname, 'src/browserIndex.js'),
            name: 'DD_RUM_REQUEST', // Global name for UMD
            fileName: (format) => `datadog-rum-interceptor.browser.${format}.js`,
            formats: ['es', 'umd']
        },
        rollupOptions: {
            external: [], // Remove all external dependencies
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
                format: 'umd',
                name: 'DD_RUM_REQUEST',
                inlineDynamicImports: true
            }
        }
    }
})