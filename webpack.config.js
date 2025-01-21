// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = [
    // Regular (non-minified) version
    {
        entry: './src/index.ts',
        mode: 'production',
        devtool: 'source-map',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        output: {
            filename: 'datadog-rum-interceptor.js',
            path: path.resolve(__dirname, 'dist'),
            library: {
                name: 'DDRumInterceptor',
                type: 'umd',
                export: 'default',
            },
            globalObject: 'this',
        },
        externals: {
            '@datadog/browser-rum': {
                commonjs: '@datadog/browser-rum',
                commonjs2: '@datadog/browser-rum',
                amd: '@datadog/browser-rum',
                root: 'DD_RUM'
            },
            '@datadog/browser-logs': {
                commonjs: '@datadog/browser-logs',
                commonjs2: '@datadog/browser-logs',
                amd: '@datadog/browser-logs',
                root: 'DD_LOGS'
            }
        },
        optimization: {
            minimize: false, // No minification for regular version
        },
        experiments: {
            outputModule: false, // Webpack 5 allows custom module types; ensure no breaking behavior
        },
        performance: {
            hints: false,
        },
        stats: {
            errorDetails: true, // Improves debugging in case of build errors
        },
        watch: process.env.NODE_ENV === 'development', // Enable watch mode only for development
    },
    // Minified version
    {
        entry: './src/index.ts',
        mode: 'production',
        devtool: 'source-map',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        output: {
            filename: 'datadog-rum-interceptor.min.js',
            path: path.resolve(__dirname, 'dist'),
            library: {
                name: 'DDRumInterceptor',
                type: 'umd',
                export: 'default',
            },
            globalObject: 'this',
        },
        externals: {
            '@datadog/browser-rum': {
                commonjs: '@datadog/browser-rum',
                commonjs2: '@datadog/browser-rum',
                amd: '@datadog/browser-rum',
                root: 'DD_RUM'
            },
            '@datadog/browser-logs': {
                commonjs: '@datadog/browser-logs',
                commonjs2: '@datadog/browser-logs',
                amd: '@datadog/browser-logs',
                root: 'DD_LOGS'
            }
        },
        optimization: {
            minimize: true, // Minify for production
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        format: {
                            comments: false,
                        },
                    },
                    extractComments: false,
                }),
            ],
        },
        experiments: {
            outputModule: false, // Webpack 5 allows custom module types; ensure no breaking behavior
        },
        performance: {
            hints: 'warning',
        },
        stats: {
            errorDetails: true, // Improves debugging in case of build errors
        },
    },
];
