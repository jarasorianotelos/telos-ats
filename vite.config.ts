import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Group vendor dependencies
          vendor: [
            "react",
            "react-dom",
            "react-router-dom",
            "@tanstack/react-query",
            "date-fns",
          ],
          // Group UI components
          ui: [
            "lucide-react",
          ],
          // Group Supabase related code
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase the warning limit to 1000kb
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "date-fns",
      "@supabase/supabase-js",
    ],
  },
});
