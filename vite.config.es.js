// vite.config.dev.js
import { defineConfig } from "vite";

let currentFormat;

export default defineConfig(({ mode }) => {
    return {
        build: {
            minify: true,
            outDir: "dist",
            emptyOutDir: false,
            lib: {
                entry: ["src/index.js"],
                fileName: (format, entryName) => `${format}/${entryName}.js`,
                formats: ["es", "cjs"],
            },
            rollupOptions: {
                external: (id) => id.includes("@mswjs/interceptors"),
            },
        },
        watch: {
            include: ["src/**"],
            exclude: ["node_modules/**"],
        }
    };
});
