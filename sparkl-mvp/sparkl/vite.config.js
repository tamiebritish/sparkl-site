import { defineConfig } from 'vite'

export default defineConfig({
  // Serve from root, output to dist/
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Make env vars available with VITE_ prefix
  envPrefix: 'VITE_',
})
