import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    // Specify build output directory inside server/public
    outDir: path.resolve(__dirname, 'server/public'),
    // Clean the output directory before build
    emptyOutDir: true
  }
}) 