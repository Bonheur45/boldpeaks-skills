import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  optimizeDeps: {
    // Helps avoid duplicate React copies in dev optimizer
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
  resolve: {
    // Prevent duplicate React copies which can cause "Invalid hook call" at runtime
    dedupe: ["react", "react-dom"],
    alias: {
      // Force a single React instance
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
