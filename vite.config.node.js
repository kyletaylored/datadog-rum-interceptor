// vite.config.node.js
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    resolve: {
        conditions: ['node']
    },
    build: {
        outDir: 'dist/node',
        lib: {
            entry: path.resolve(__dirname, 'src/nodeIndex.js'),
            name: 'DD_RUM_INTERCEPTOR_NODE',
            formats: ['cjs', 'es'],
            fileName: (format) => `datadog-rum-interceptor.node.${format}.js`,
        },
        rollupOptions: {
            // Externalize @mswjs/interceptors and Datadog libraries
            external: [
                '@mswjs/interceptors',
                '@datadog/browser-rum',
                '@datadog/browser-logs'
            ],
            output: {
                entryFileNames: 'datadog-rum-interceptor.node.[format].js'
            }
        },
        ssr: true,
        target: ['node16', 'node18', 'node20'],
    }
})
