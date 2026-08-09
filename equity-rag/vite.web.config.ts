import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Web demo app. Port is fixed + strict to avoid colliding with sibling Vite
// projects in this workspace (world-cup-app owns 5273, Vite default is 5173).
export default defineConfig({
  root: "web",
  plugins: [react()],
  server: { port: 5280, strictPort: true },
  build: { outDir: "../dist", emptyOutDir: true },
});
