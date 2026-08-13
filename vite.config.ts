import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Keep one versioned stylesheet for the whole Mini App. This prevents a
  // partially cached page from rendering a new screen with an older CSS file.
  build: { target: 'es2022', sourcemap: true, cssCodeSplit: false },
})
