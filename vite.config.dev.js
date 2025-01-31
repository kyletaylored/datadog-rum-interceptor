// vite.config.dev.js
import { defineConfig } from "vite";

let currentFormat;

export default defineConfig(({ mode }) => {
    return {
        build: {
            target: "es2015",
            minify: (mode === 'development') ? false : true,
            outDir: "dist",
            lib: {
                entry: ["src/index.js"],
                name: "DD_RUM_INTERCEPTOR",
                fileName: (format, entryName) => `${format}/${entryName}.js`,
                formats: ["es", "umd", "cjs"],
            },

        },
        watch: {
            include: ["src/**"],
            exclude: ["node_modules/**"],
        }
    };
});
