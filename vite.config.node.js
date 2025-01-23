// vite.config.node.js
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    resolve: {
        // Let the bundler know to use Node condition exports
        conditions: ['node']
    },
    build: {
        ssr: true,
        outDir: 'dist/node',
        lib: {
            entry: path.resolve(__dirname, 'src/nodeIndex.js'),
            name: 'DD_RUM_REQUEST_NODE',
            formats: ['cjs', 'es'],
            fileName: (format) => `datadog-rum-interceptor.node.${format}.js`
        },
        rollupOptions: {
            external: [],
            output: {}
        }
    }
})
