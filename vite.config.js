// vite.config.js
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
    // Base configuration.
    let config = {
        build: {
            target: "es2015",
            minify: true,
            outDir: "dist",
            lib: {
                entry: ["src/index.js"],
                name: "DD_RUM_INTERCEPTOR",
                fileName: (format, entryName) => `${format}/${entryName}.js`,
                formats: ["es", "umd", "cjs"],
            },
            rollupOptions: {
                output: {
                    format: "umd",
                    name: "DD_RUM_INTERCEPTOR",
                },
            },
        },
        watch: {
            include: ["src/**"],
            exclude: ["node_modules/**"],
        }
    };

    // Development configuration.
    if (mode === 'development') {
        config.build.minify = false;
    }

    return config;
});
