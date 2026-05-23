import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dedicated port for world-cup-app to avoid collision with sibling projects.
    // strictPort: true → fail fast instead of silently falling back to 5174+
    // (which previously caused the preview to load a different app on 5173).
    port: 5273,
    strictPort: true,
  },
  test: {
    environment: 'node',
  },
})
