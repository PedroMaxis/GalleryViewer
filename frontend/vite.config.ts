import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
// modo "demo": versão estática publicada no GitHub Pages (ver src/lib/demo.ts)
export default defineConfig(({ mode }) => ({
  base: mode === "demo" ? "./" : "/",
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    // em desenvolvimento, /api vai para o backend local (porta 5000)
    proxy: { "/api": "http://localhost:5000" },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
}));
