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
            name: 'DD_RUM_REQUEST_NODE',
            formats: ['cjs', 'es'],
            fileName: (format) => `datadog-rum-interceptor.node.${format}.js`,
        },
        rollupOptions: {
            external: ['@mswjs/interceptors'],
            output: {
                entryFileNames: 'datadog-rum-interceptor.node.[format].js'
            }
        },
        ssr: true,
        target: ['node16', 'node18', 'node20'],
    }
})
