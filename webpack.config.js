// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    mode: process.env.NODE_ENV || 'production',
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
        filename: `datadog-rum-interceptor${process.env.NODE_ENV === 'production' ? '.min' : ''}.js`,
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
        minimize: process.env.NODE_ENV === 'production',
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
        hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
    },
    stats: {
        errorDetails: true, // Improves debugging in case of build errors
    },
};
