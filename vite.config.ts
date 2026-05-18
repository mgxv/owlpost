import { defineConfig } from "vite";
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
            input: "index.html",
        },
    },
}));
