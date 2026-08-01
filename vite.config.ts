import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed dev port and no clobbering of the terminal.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Don't watch the Rust backend from Vite.
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    outDir: "dist",
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
  },
});
