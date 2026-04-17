import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("monaco-editor")) {
            return "vendor-monaco";
          }

          if (id.includes("three") || id.includes("@react-three")) {
            return "vendor-three";
          }

          if (id.includes("reactflow")) {
            return "vendor-reactflow";
          }

          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }

          if (id.includes("@tanstack")) {
            return "vendor-query";
          }

          return "vendor";
        }
      }
    }
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
