import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
    // Relative base so assets resolve correctly when loaded via file:// in production
    base: "./",
    plugins: [tailwindcss(), react()],
    clearScreen: false,
    server: {
        port: 3000,
        strictPort: true,
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
        target: ["chrome130"],
        sourcemap: mode === "development",
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                titlebar: resolve(__dirname, "titlebar.html"),
                error: resolve(__dirname, "errorPage.html"),
            },
        },
    },
}));
