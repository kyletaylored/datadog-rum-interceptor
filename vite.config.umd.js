// vite.config.dev.js
import { defineConfig } from "vite";

let currentFormat;

export default defineConfig(({ mode }) => {
    return {
        build: {
            target: "es2015",
            outDir: "dist",
            emptyOutDir: false,
            lib: {
                entry: ["src/index.js"],
                name: "DD_RUM_INTERCEPTOR",
                fileName: (format, entryName) => `${format}/${entryName}.js`,
                formats: ["umd"],
            },
        },
        watch: {
            include: ["src/**"],
            exclude: ["node_modules/**"],
        }
    };
});
